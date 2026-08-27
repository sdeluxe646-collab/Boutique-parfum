import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, Store, CreditCard, Loader2, ShoppingCart, Calculator, PackagePlus, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, formatEUR } from "@/lib/api";

const SHIPPING = [
  { id: "mondial_relay", name: "Mondial Relay Point Relais", time: "Livraison sous 3 à 5 jours ouvrés", price: 4.99, badge: "Point Relais", icon: Store, testid: "shipping-mondial-relay" },
];

const GROUPAGE_OPTION = { id: "groupage", name: "Ajouter à mon colis en cours", time: "Regroupé avec votre commande précédente", price: 0, badge: "Port offert", icon: PackagePlus, testid: "shipping-groupage" };

const StepBadge = ({ children }) => (
  <span className="text-xs font-mono-lux uppercase tracking-[0.2em] text-[#C84B67] bg-[#FDF2F4] px-3 py-1 rounded-full font-semibold">
    {children}
  </span>
);

const Field = ({ label, testid, ...props }) => (
  <label className="block">
    <span className="block text-xs uppercase tracking-[0.12em] text-[#6E6763] mb-1.5">{label}</span>
    <input data-testid={testid} className="lux-input" {...props} />
  </label>
);

export default function CheckoutForm() {
  const [form, setForm] = useState({
    amount: "", reference: "", pseudo: "", firstname: "", lastname: "",
    email: "", phone: "", address: "", postal_code: "", city: "", country: "France",
  });
  const [shipping, setShipping] = useState("mondial_relay");
  const [cgv, setCgv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupEligible, setGroupEligible] = useState(null);
  const [relays, setRelays] = useState([]);
  const [selectedRelay, setSelectedRelay] = useState(null);
  const [relayLoading, setRelayLoading] = useState(false);
  const [relayManual, setRelayManual] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    const montant = searchParams.get("montant");
    if (ref || montant) {
      setForm((f) => ({ ...f, reference: ref || f.reference, amount: montant || f.amount }));
      if (ref) toast.success(`Référence ${ref} pré-remplie — complétez vos coordonnées.`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const checkGroupEligibility = async () => {
    const email = form.email.trim();
    if (!email || !email.includes("@")) return;
    try {
      const { data } = await api.get(`/orders/group-eligibility?email=${encodeURIComponent(email)}`);
      setGroupEligible(data.eligible ? data : null);
      if (data.eligible) {
        toast.success(`Commande en cours trouvée (${data.reference}) — vous pouvez regrouper sans frais de port !`);
      }
    } catch { /* silent */ }
  };

  const searchRelays = async () => {
    if (!form.postal_code.trim()) return toast.error("Indiquez d'abord votre code postal (étape 1).");
    setRelayLoading(true);
    setRelays([]);
    setSelectedRelay(null);
    setRelayManual(false);
    try {
      const { data } = await api.post("/relay-points", { postcode: form.postal_code.trim(), country: "FR" });
      if (!data.length) {
        toast.error("Aucun Point Relais trouvé — indiquez votre point relais préféré ci-dessous.");
        setRelayManual(true);
        return;
      }
      setRelays(data);
    } catch {
      toast.error("Recherche indisponible — indiquez votre point relais préféré ci-dessous.");
      setRelayManual(true);
    } finally {
      setRelayLoading(false);
    }
  };

  const shippingOptions = groupEligible ? [...SHIPPING, GROUPAGE_OPTION] : SHIPPING;

  const amount = parseFloat(String(form.amount).replace(",", ".")) || 0;
  const shippingCost = useMemo(() => shippingOptions.find((s) => s.id === shipping)?.price ?? 0, [shipping, shippingOptions]);
  const total = Math.round((amount + shippingCost) * 100) / 100;

  const submit = async () => {
    if (!amount || amount <= 0) return toast.error("Veuillez saisir le montant de votre commande.");
    if (!form.reference.trim()) return toast.error("Veuillez indiquer la référence de l'article du live.");
    for (const k of ["firstname", "lastname", "email", "phone", "address", "postal_code", "city"]) {
      if (!form[k].trim()) return toast.error("Veuillez compléter toutes vos coordonnées.");
    }
    if (shipping === "mondial_relay" && !selectedRelay) return toast.error("Veuillez choisir votre Point Relais Mondial Relay.");
    if (!cgv) return toast.error("Veuillez accepter les Conditions Générales de Vente.");

    setLoading(true);
    try {
      const { data: order } = await api.post("/orders", {
        ...form,
        amount,
        shipping_method: shipping,
        cgv_accepted: cgv,
        relay_id: selectedRelay?.id || null,
        relay_name: selectedRelay
          ? selectedRelay.id === "MANUEL"
            ? selectedRelay.name
            : `${selectedRelay.name} — ${selectedRelay.address}, ${selectedRelay.postcode} ${selectedRelay.city}`
          : null,
        relay_address: selectedRelay && selectedRelay.id !== "MANUEL" ? `${selectedRelay.address}, ${selectedRelay.postcode} ${selectedRelay.city}` : null,
      });
      const { data: checkout } = await api.post("/payments/checkout", {
        order_id: order.id,
        origin_url: window.location.origin,
      });
      toast.success("Redirection vers le paiement sécurisé…");
      window.location.href = checkout.checkout_url;
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start" data-testid="checkout-form">
      <div className="lg:col-span-7 space-y-8">
        {/* ÉTAPE 1 */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl border border-[#EBE5DB] p-6 sm:p-8"
        >
          <StepBadge>Étape 1 — Montant &amp; Coordonnées</StepBadge>

          <div className="mt-6 bg-[#FAF7F2] border border-[#EBE5DB] rounded-2xl p-6 text-center">
            <span className="text-xs font-mono-lux uppercase tracking-[0.25em] text-[#6E6763]">Montant annoncé au live</span>
            <div className="mt-3 flex items-center justify-center gap-2">
              <input
                data-testid="input-amount"
                type="number" min="0" step="0.01" placeholder="0,00"
                value={form.amount} onChange={set("amount")}
                className="w-44 text-center text-3xl font-mono-lux font-semibold text-[#1A1513] bg-white border border-[#EBE5DB] rounded-xl py-3 outline-none focus:border-[#D4AF37]"
              />
              <span className="text-2xl text-[#6E6763]">€</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Référence de l'article (live)" testid="input-reference" placeholder="ex: PARFUM-ROSE-LIVE-01" value={form.reference} onChange={set("reference")} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Pseudo TikTok / Instagram (optionnel)" testid="input-pseudo" placeholder="@votre_pseudo" value={form.pseudo} onChange={set("pseudo")} />
            </div>
            <Field label="Prénom" testid="input-firstname" placeholder="Marine" value={form.firstname} onChange={set("firstname")} />
            <Field label="Nom" testid="input-lastname" placeholder="Dupont" value={form.lastname} onChange={set("lastname")} />
            <label className="block">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#6E6763] mb-1.5">Adresse e-mail</span>
              <input data-testid="input-email" type="email" placeholder="marine@example.com" value={form.email} onChange={set("email")} onBlur={checkGroupEligibility} className="lux-input" />
              {groupEligible && (
                <span className="block mt-1.5 text-xs text-emerald-700" data-testid="group-eligible-hint">
                  ✓ Colis en cours trouvé — l'option "port offert" est disponible à l'étape 2
                </span>
              )}
            </label>
            <Field label="Numéro de téléphone" testid="input-phone" type="tel" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={set("phone")} />
            <div className="sm:col-span-2">
              <Field label="Adresse" testid="input-address" placeholder="12 Rue de la Paix" value={form.address} onChange={set("address")} />
            </div>
            <Field label="Code postal" testid="input-postal-code" placeholder="75002" value={form.postal_code} onChange={set("postal_code")} />
            <Field label="Ville" testid="input-city" placeholder="Paris" value={form.city} onChange={set("city")} />
            <label className="block sm:col-span-2">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#6E6763] mb-1.5">Pays</span>
              <select data-testid="select-country" className="lux-input" value={form.country} onChange={set("country")}>
                {["France", "Belgique", "Suisse", "Luxembourg"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </motion.section>

        {/* ÉTAPE 2 */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl border border-[#EBE5DB] p-6 sm:p-8"
        >
          <StepBadge>Étape 2 — Mode de livraison</StepBadge>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {shippingOptions.map((s) => {
              const active = shipping === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  data-testid={s.testid}
                  onClick={() => setShipping(s.id)}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    active ? "border-[#C84B67] bg-[#FDF7F4]" : "border-[#EBE5DB] bg-white hover:border-[#D4AF37]/60"
                  }`}
                >
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${active ? "bg-[#C84B67] text-white" : "bg-[#FAF7F2] text-[#6E6763]"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-[#1A1513]">{s.name}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${s.id === "groupage" ? "bg-emerald-100 text-emerald-800" : "bg-[#F3EAD3] text-[#8C1C35]"}`}>{s.badge}</span>
                    </span>
                    <span className="block text-xs text-[#6E6763] mt-0.5">{s.time}</span>
                  </span>
                  <span className="font-mono-lux font-semibold text-[#1A1513]">{s.price === 0 ? "Offert" : formatEUR(s.price)}</span>
                </button>
              );
            })}
          </div>

          {shipping === "mondial_relay" && (
            <div className="mt-5 rounded-2xl border border-[#EBE5DB] bg-[#FAF7F2] p-5" data-testid="relay-picker">
              <p className="text-xs uppercase tracking-[0.15em] text-[#6E6763] mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#C84B67]" /> Choisissez votre Point Relais
              </p>
              <div className="flex gap-2">
                <input
                  data-testid="input-relay-postcode"
                  className="lux-input flex-1" placeholder="Code postal (ex : 75002)"
                  value={form.postal_code} onChange={set("postal_code")}
                />
                <button
                  type="button" data-testid="button-search-relays" onClick={searchRelays} disabled={relayLoading}
                  className="rounded-xl bg-[#1A1513] text-[#D4AF37] px-4 py-2 text-sm flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-60"
                >
                  {relayLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Rechercher
                </button>
              </div>
              {relays.length > 0 && (
                <div className="mt-4 max-h-56 overflow-y-auto space-y-2 pr-1">
                  {relays.map((r) => (
                    <button
                      key={r.id} type="button"
                      data-testid={`relay-option-${r.id}`}
                      onClick={() => setSelectedRelay(r)}
                      className={`block w-full text-left rounded-xl border p-3 text-sm transition-colors ${
                        selectedRelay?.id === r.id ? "border-[#C84B67] bg-white" : "border-[#EBE5DB] bg-white/60 hover:border-[#D4AF37]/60"
                      }`}
                    >
                      <span className="font-medium text-[#1A1513]">{r.name || `Point Relais ${r.id}`}</span>
                      <span className="block text-xs text-[#6E6763]">{r.address}, {r.postcode} {r.city}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedRelay && (
                <p className="mt-3 text-xs text-emerald-700" data-testid="relay-selected-hint">
                  ✓ Point Relais sélectionné : {selectedRelay.name} ({selectedRelay.city})
                </p>
              )}
              {relayManual && (
                <label className="block mt-4">
                  <span className="block text-xs uppercase tracking-[0.12em] text-[#6E6763] mb-1.5">Votre Point Relais préféré (nom + adresse)</span>
                  <input
                    data-testid="input-relay-manual"
                    className="lux-input" placeholder="ex : Relais Pickup Carrefour, 12 Rue des Lilas, Lyon"
                    value={form.relay_manual || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, relay_manual: v }));
                      setSelectedRelay(v.trim() ? { id: "MANUEL", name: v.trim(), address: "", postcode: form.postal_code, city: form.city } : null);
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </motion.section>

        {/* ÉTAPE 3 */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl border border-[#EBE5DB] p-6 sm:p-8"
        >
          <StepBadge>Étape 3 — Mode de paiement</StepBadge>
          <div className="mt-6 rounded-2xl border-2 border-[#C84B67] bg-[#FDF7F4] p-5 flex items-center gap-4" data-testid="payment-method-stripe">
            <span className="h-11 w-11 rounded-xl bg-[#1A1513] text-[#D4AF37] flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-medium text-[#1A1513]">Carte bancaire</p>
              <p className="text-xs text-[#6E6763]">VISA • Mastercard • CB — paiement ultra-sécurisé via Stripe</p>
            </div>
            <span className="h-5 w-5 rounded-full bg-[#C84B67] text-white flex items-center justify-center text-xs">✓</span>
          </div>

          <label className="mt-6 flex items-start gap-3 cursor-pointer" data-testid="checkbox-cgv">
            <input type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} className="mt-1 h-4 w-4 accent-[#C84B67]" />
            <span className="text-sm text-[#6E6763]">
              J'accepte les <span className="underline text-[#1A1513]">Conditions Générales de Vente</span> et la <span className="underline text-[#1A1513]">Politique de confidentialité</span>.
            </span>
          </label>
        </motion.section>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5 lg:sticky lg:top-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-[#161210] text-[#FAF7F2] rounded-2xl p-6 sm:p-8 gold-border-card"
          data-testid="order-summary"
        >
          <h3 className="font-display text-2xl">Résumé de la commande</h3>
          <div className="hairline my-5" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[#B9B0A6]"><ShoppingCart className="h-4 w-4" /> Montant article(s)</span>
              <span className="font-mono-lux" data-testid="summary-amount">{amount ? formatEUR(amount) : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[#B9B0A6]"><Truck className="h-4 w-4" /> Livraison</span>
              <span className="font-mono-lux" data-testid="summary-shipping">{formatEUR(shippingCost)}</span>
            </div>
            {form.reference && (
              <div className="flex justify-between items-center">
                <span className="text-[#B9B0A6]">Référence</span>
                <span className="font-mono-lux text-xs text-[#D4AF37]">{form.reference}</span>
              </div>
            )}
          </div>
          <div className="hairline my-5" />
          <div className="flex justify-between items-end">
            <span className="flex items-center gap-2 text-[#B9B0A6]"><Calculator className="h-4 w-4" /> Total à payer</span>
            <span className="text-3xl font-mono-lux font-bold gold-text" data-testid="summary-total">{formatEUR(total)}</span>
          </div>

          <button
            data-testid="button-submit-payment"
            onClick={submit}
            disabled={loading}
            className="mt-7 w-full rounded-full bg-[#D4AF37] text-[#0B0908] py-4 text-sm font-semibold tracking-wide hover:bg-[#F3EAD3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? "Préparation du paiement…" : `Procéder au paiement • ${formatEUR(total)}`}
          </button>
          <p className="mt-4 text-center text-xs text-[#6E6763] flex items-center justify-center gap-1.5">
            <ShieldCheckIcon /> Paiement sécurisé SSL — Stripe
          </p>
        </motion.div>
      </aside>
    </div>
  );
}

const ShieldCheckIcon = () => (
  <svg className="h-3.5 w-3.5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
