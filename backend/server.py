from dotenv import load_dotenv
load_dotenv()

import os
import logging
import uuid
import bcrypt
import jwt
import stripe
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY") or "sk_test_emergent"
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

SHIPPING_METHODS = {
    "chronopost_relais": {"name": "Chronopost Relais Express", "price": 4.90},
    "chronopost_domicile": {"name": "Chronopost Domicile Express 24h", "price": 8.90},
    "mondial_relay": {"name": "Mondial Relay Point Relais", "price": 3.90},
}

logger = logging.getLogger(__name__)


# ---------- Auth ----------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_since = attempts.get("updated_at", datetime.now(timezone.utc))
        if isinstance(locked_since, str):
            locked_since = datetime.fromisoformat(locked_since)
        if datetime.now(timezone.utc) - locked_since < timedelta(minutes=15):
            raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(user["_id"], email)
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    return {"email": email, "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "token": token}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return {"email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"status": "ok"}


# ---------- Orders ----------

class OrderCreate(BaseModel):
    amount: float = Field(gt=0, le=100000)
    reference: str = Field(min_length=1, max_length=120)
    pseudo: Optional[str] = ""
    firstname: str = Field(min_length=1, max_length=80)
    lastname: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=30)
    address: str = Field(min_length=1, max_length=200)
    postal_code: str = Field(min_length=2, max_length=12)
    city: str = Field(min_length=1, max_length=80)
    country: str = "France"
    shipping_method: str
    cgv_accepted: bool


@api_router.get("/shipping-methods")
async def get_shipping_methods():
    return [{"id": k, **v} for k, v in SHIPPING_METHODS.items()]


@api_router.post("/orders")
async def create_order(req: OrderCreate):
    if not req.cgv_accepted:
        raise HTTPException(status_code=400, detail="Vous devez accepter les CGV")
    method = SHIPPING_METHODS.get(req.shipping_method)
    if not method:
        raise HTTPException(status_code=400, detail="Mode de livraison invalide")
    shipping_cost = method["price"]
    total = round(req.amount + shipping_cost, 2)
    doc = {
        "_id": str(uuid.uuid4()),
        "amount": round(req.amount, 2),
        "reference": req.reference.strip(),
        "pseudo": (req.pseudo or "").strip(),
        "firstname": req.firstname.strip(),
        "lastname": req.lastname.strip(),
        "email": req.email.lower(),
        "phone": req.phone.strip(),
        "address": req.address.strip(),
        "postal_code": req.postal_code.strip(),
        "city": req.city.strip(),
        "country": req.country,
        "shipping_method": req.shipping_method,
        "shipping_name": method["name"],
        "shipping_cost": shipping_cost,
        "total": total,
        "payment_status": "pending",
        "stripe_session_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)
    doc["id"] = doc.pop("_id")
    return doc


# ---------- Payments (Stripe) ----------

class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str


@api_router.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest):
    order = await db.orders.find_one({"_id": req.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Commande déjà payée")

    unit_amount = int(round(order["total"] * 100))
    kwargs = dict(
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {
                    "name": f"Commande {order['reference']} — L'Atelier des parfums",
                    "description": f"Livraison : {order['shipping_name']}",
                },
                "unit_amount": unit_amount,
            },
            "quantity": 1,
        }],
        mode="payment",
        customer_email=order["email"],
        success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{req.origin_url}/payment/cancel",
        metadata={"order_id": req.order_id},
    )
    try:
        session = stripe.checkout.Session.create(**kwargs, automatic_tax={"enabled": True})
    except stripe.error.InvalidRequestError:
        session = stripe.checkout.Session.create(**kwargs)

    await db.orders.update_one({"_id": req.order_id}, {"$set": {"stripe_session_id": session.id}})
    return {"checkout_url": session.url, "session_id": session.id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    order = await db.orders.find_one({"stripe_session_id": session_id})
    if not order:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    if order.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.orders.update_one(
                    {"stripe_session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
                )
                order["payment_status"] = "paid"
        except stripe.error.StripeError:
            pass
    return {"session_id": session_id, "payment_status": order["payment_status"], "total": order["total"]}


@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature invalide")
    obj, t = event["data"]["object"], event["type"]
    if t in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        await db.orders.update_one(
            {"stripe_session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
        )
    elif t in ("checkout.session.expired", "checkout.session.async_payment_failed"):
        await db.orders.update_one(
            {"stripe_session_id": obj["id"]},
            {"$set": {"payment_status": "failed"}},
        )
    return {"status": "ok"}


# ---------- Admin ----------

def serialize_order(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@api_router.get("/admin/orders")
async def admin_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find().sort("created_at", -1).to_list(500)
    return [serialize_order(o) for o in orders]


@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    orders = await db.orders.find().to_list(1000)
    paid = [o for o in orders if o.get("payment_status") == "paid"]
    pending = [o for o in orders if o.get("payment_status") == "pending"]
    total_revenue = round(sum(o.get("total", 0) for o in paid), 2)
    aov = round(total_revenue / len(paid), 2) if paid else 0
    return {
        "total_revenue": total_revenue,
        "paid_orders_count": len(paid),
        "pending_orders_count": len(pending),
        "total_orders_count": len(orders),
        "average_order_value": aov,
    }


class StatusUpdate(BaseModel):
    payment_status: str


@api_router.patch("/admin/orders/{order_id}/status")
async def admin_update_status(order_id: str, req: StatusUpdate, user: dict = Depends(get_current_user)):
    if req.payment_status not in ("paid", "pending", "failed"):
        raise HTTPException(status_code=400, detail="Statut invalide")
    update = {"payment_status": req.payment_status}
    if req.payment_status == "paid":
        update["paid_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.orders.update_one({"_id": order_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return {"status": "ok"}


@api_router.get("/")
async def root():
    return {"message": "L'Atelier des parfums API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "_id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin — L'Atelier des parfums",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if await db.orders.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        samples = [
            {"amount": 45.0, "reference": "PARFUM-OUD-ROYAL-50ML", "pseudo": "@marine_live", "firstname": "Marine",
             "lastname": "Dupont", "email": "marine.dupont@example.com", "phone": "+33612345678",
             "address": "12 Rue de la Paix", "postal_code": "75002", "city": "Paris", "country": "France",
             "shipping_method": "chronopost_relais", "payment_status": "paid",
             "paid_at": (now - timedelta(days=1)).isoformat(), "created_at": (now - timedelta(days=1)).isoformat()},
            {"amount": 32.5, "reference": "PARFUM-ROSE-LIVE-01", "pseudo": "@sophie.p", "firstname": "Sophie",
             "lastname": "Martin", "email": "sophie.martin@example.com", "phone": "+33698765432",
             "address": "5 Avenue des Fleurs", "postal_code": "69001", "city": "Lyon", "country": "France",
             "shipping_method": "mondial_relay", "payment_status": "pending",
             "created_at": (now - timedelta(hours=5)).isoformat()},
            {"amount": 78.0, "reference": "COFFRET-DECOUVERTE-X3", "pseudo": "", "firstname": "Karim",
             "lastname": "Benali", "email": "karim.benali@example.com", "phone": "+33711223344",
             "address": "8 Rue du Vieux Port", "postal_code": "13001", "city": "Marseille", "country": "France",
             "shipping_method": "chronopost_domicile", "payment_status": "pending",
             "created_at": (now - timedelta(hours=2)).isoformat()},
        ]
        for s in samples:
            method = SHIPPING_METHODS[s["shipping_method"]]
            s.update({
                "_id": str(uuid.uuid4()),
                "shipping_name": method["name"],
                "shipping_cost": method["price"],
                "total": round(s["amount"] + method["price"], 2),
                "stripe_session_id": None,
            })
        await db.orders.insert_many(samples)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
