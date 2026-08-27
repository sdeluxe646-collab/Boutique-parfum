from dotenv import load_dotenv
load_dotenv()

import os
import logging
import uuid
import bcrypt
import jwt
import stripe
import httpx
import xml.etree.ElementTree as ET
from hashlib import md5
from xml.sax.saxutils import escape
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
    "groupage": {"name": "Colis groupé — port offert", "price": 0.0},
}

MR_ENDPOINT = os.environ.get("MR_ENDPOINT", "https://api.mondialrelay.com/Web_Services.asmx")
MR_ENSEIGNE = os.environ.get("MR_ENSEIGNE", "BDTEST13")
MR_PRIVATE_KEY = os.environ.get("MR_PRIVATE_KEY", "TestAPI1key")


# ---------- Mondial Relay helpers ----------

def mr_security_hash(values) -> str:
    raw = "".join("" if v is None else str(v) for v in values) + MR_PRIVATE_KEY
    return md5(raw.encode("utf-8")).hexdigest().upper()


async def mr_soap_call(operation: str, fields) -> ET.Element:
    ns = "http://www.mondialrelay.fr/webservice/"
    body = "".join(f"<{k}>{escape(str(v))}</{k}>" for k, v in fields)
    xml = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body><{operation} xmlns="{ns}">{body}</{operation}></soap:Body>
</soap:Envelope>'''
    headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": f'"{ns}{operation}"'}
    async with httpx.AsyncClient(timeout=30) as client_http:
        resp = await client_http.post(MR_ENDPOINT, content=xml.encode(), headers=headers)
    resp.raise_for_status()
    return ET.fromstring(resp.content)


def mr_tag(root: ET.Element, name: str) -> str:
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1] == name:
            return (node.text or "").strip()
    return ""


def mr_child(node: ET.Element, name: str) -> str:
    for x in node.iter():
        if x is not node and x.tag.rsplit("}", 1)[-1] == name:
            return (x.text or "").strip()
    return ""

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
    relay_id: Optional[str] = None
    relay_name: Optional[str] = None
    relay_address: Optional[str] = None


async def find_groupable_order(email: str) -> Optional[dict]:
    """Latest paid/pending order with real shipping for this email, within 7 days."""
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    return await db.orders.find_one(
        {
            "email": email.lower(),
            "payment_status": {"$in": ["paid", "pending"]},
            "shipping_method": {"$ne": "groupage"},
            "created_at": {"$gte": since},
        },
        sort=[("created_at", -1)],
    )


@api_router.get("/orders/group-eligibility")
async def group_eligibility(email: str):
    order = await find_groupable_order(email)
    if not order:
        return {"eligible": False}
    return {"eligible": True, "reference": order.get("reference"), "created_at": order.get("created_at")}


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

    group_id = None
    if req.shipping_method == "groupage":
        base = await find_groupable_order(req.email)
        if not base:
            raise HTTPException(status_code=400, detail="Aucune commande en cours à regrouper pour cet e-mail")
        group_id = base["_id"]
    if req.shipping_method == "mondial_relay" and not req.relay_id:
        raise HTTPException(status_code=400, detail="Veuillez choisir votre Point Relais")

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
        "group_id": group_id,
        "relay_id": req.relay_id,
        "relay_name": req.relay_name,
        "relay_address": req.relay_address,
        "total": total,
        "payment_status": "pending",
        "stripe_session_id": None,
        "expedition_num": None,
        "label_url": None,
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


# ---------- Mondial Relay ----------

class RelaySearchRequest(BaseModel):
    postcode: str = Field(min_length=4, max_length=10)
    city: Optional[str] = ""
    country: str = "FR"
    results: int = Field(10, ge=1, le=30)


@api_router.post("/relay-points")
async def find_relay_points(req: RelaySearchRequest):
    values = [
        MR_ENSEIGNE, req.country, "", req.city or "", req.postcode, "", "",
        "", "500", "24R", "0", "20", "", str(req.results),
    ]
    fields = [
        ("Enseigne", MR_ENSEIGNE), ("Pays", req.country), ("NumPointRelais", ""),
        ("Ville", req.city or ""), ("CP", req.postcode), ("Latitude", ""), ("Longitude", ""),
        ("Taille", ""), ("Poids", "500"), ("Action", "24R"), ("DelaiEnvoi", "0"),
        ("RayonRecherche", "20"), ("TypeActivite", ""), ("NACE", ""),
        ("NombreResultats", str(req.results)),
        ("Security", mr_security_hash(values)),
    ]
    try:
        root = await mr_soap_call("WSI4_PointRelais_Recherche", fields)
    except (httpx.HTTPError, ET.ParseError) as exc:
        raise HTTPException(status_code=400, detail="Service Mondial Relay momentanément indisponible")
    stat = mr_tag(root, "STAT")
    if stat != "0":
        raise HTTPException(status_code=400, detail=f"Service Mondial Relay momentanément indisponible (code {stat})")
    relays = []
    for node in root.iter():
        if node.tag.rsplit("}", 1)[-1] == "PointRelais_Details":
            relays.append({
                "id": mr_child(node, "Num"),
                "name": mr_child(node, "Lcom"),
                "address": mr_child(node, "LgAdr1"),
                "postcode": mr_child(node, "CP"),
                "city": mr_child(node, "Ville"),
                "distance": mr_child(node, "Distance"),
            })
    return relays


@api_router.post("/admin/orders/{order_id}/label")
async def create_label(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    if order.get("label_url"):
        return {"expedition": order.get("expedition_num"), "pdf_url": order["label_url"]}
    if order.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="La commande doit être payée pour générer l'étiquette")
    if order.get("shipping_method") != "mondial_relay" or not order.get("relay_id"):
        raise HTTPException(status_code=400, detail="Étiquette disponible uniquement pour les envois Mondial Relay avec Point Relais")

    weight = 500
    if order.get("group_id"):
        grouped = await db.orders.count_documents({"group_id": order["group_id"], "payment_status": "paid"})
        weight = 500 + 250 * grouped

    fields = [
        ("Enseigne", MR_ENSEIGNE), ("ModeCol", "REL"), ("ModeLiv", "24R"),
        ("NDossier", order_id[:20]), ("NClient", order_id[:8]),
        ("Expe_Langage", "FR"), ("Expe_Ad1", os.environ.get("MR_SENDER_NAME", "L'Atelier des parfums")),
        ("Expe_Ad2", ""), ("Expe_Ad3", os.environ.get("MR_SENDER_ADDRESS", "")), ("Expe_Ad4", ""),
        ("Expe_Ville", os.environ.get("MR_SENDER_CITY", "Paris")),
        ("Expe_CP", os.environ.get("MR_SENDER_POSTCODE", "75002")),
        ("Expe_Pays", "FR"), ("Expe_Tel1", os.environ.get("MR_SENDER_PHONE", "")), ("Expe_Tel2", ""),
        ("Expe_Mail", os.environ.get("MR_SENDER_EMAIL", "")),
        ("Dest_Langage", "FR"), ("Dest_Ad1", f"{order['firstname']} {order['lastname']}"),
        ("Dest_Ad2", ""), ("Dest_Ad3", order["relay_id"]), ("Dest_Ad4", ""),
        ("Dest_Ville", order["city"]), ("Dest_CP", order["postal_code"]), ("Dest_Pays", "FR"),
        ("Dest_Tel1", order["phone"]), ("Dest_Tel2", ""), ("Dest_Mail", order["email"]),
        ("Poids", str(weight)), ("Longueur", ""), ("Taille", ""), ("NbColis", "1"),
        ("CRT_Valeur", "0"), ("CRT_Devise", "EUR"), ("Exp_Valeur", "0"), ("Exp_Devise", "EUR"),
        ("COL_Rel_Pays", "FR"), ("COL_Rel", ""), ("LIV_Rel_Pays", "FR"), ("LIV_Rel", order["relay_id"]),
        ("TAvisage", ""), ("TReprise", ""), ("Montage", ""), ("TRDV", ""), ("Assurance", ""),
        ("Instructions", f"Ref: {order['reference'][:40]}"),
    ]
    signature = mr_security_hash([v for _, v in fields])
    fields += [("Security", signature), ("Texte", "")]
    try:
        root = await mr_soap_call("WSI2_CreationEtiquette", fields)
    except (httpx.HTTPError, ET.ParseError) as exc:
        raise HTTPException(status_code=400, detail="Service Mondial Relay momentanément indisponible")
    stat = mr_tag(root, "STAT")
    if stat and stat != "0":
        raise HTTPException(status_code=400, detail=f"Service Mondial Relay momentanément indisponible (code {stat})")
    expedition = mr_tag(root, "ExpeditionNum")
    url = mr_tag(root, "URL_Etiquette")
    if url and not url.startswith("http"):
        url = "https://www.mondialrelay.com" + url
    await db.orders.update_one(
        {"_id": order_id},
        {"$set": {"expedition_num": expedition, "label_url": url}},
    )
    return {"expedition": expedition, "pdf_url": url}


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
