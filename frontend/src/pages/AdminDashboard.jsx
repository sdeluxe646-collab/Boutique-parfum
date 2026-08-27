import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Euro, CheckCircle2, Clock, ShoppingBag, LogOut, Download, RefreshCw, ChevronDown, Tag, PackagePlus, ExternalLink, Plus, Trash2, SprayCan, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatEUR } from "@/lib/api";

const STATUS_STYLES = {
  paid: { label: "Payée", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  failed: { label: "Échouée", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ name: "", ref: "", price: "", size: "50 ml", notes: "", img: "", desc: "" });
  const [savingProduct, setSavingProduct] = useState(false);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      await api.get("/auth/me");
      const [{ data: o }, { data: s }, { data: m }, { data: p }] = await Promise.all([
        api.get("/admin/orders"),
        api.get("/admin/stats"),
        api.get("/admin/messages"),
        api.get("/products"),
      ]);
      setOrders(o);
      setStats(s);
      setMessages(m);
      setProducts(p);
    } catch {
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const addProduct = async (e) => {
    e.preventDefault();
    const price = parseFloat(String(productForm.price).replace(",", "."));
    if (!productForm.name.trim() || !productForm.ref.trim() || !price || price <= 0) {
      return toast.error("Nom, référence et prix sont obligatoires.");
    }
    setSavingProduct(true);
    try {
      await api.post("/admin/products", { ...productForm, price });
      toast.success(`Parfum « ${productForm.name} » ajouté au catalogue`);
      setProductForm({ name: "", ref: "", price: "", size: "50 ml", notes: "", img: "", desc: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible d'ajouter le parfum");
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (id, name) => {
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success(`« ${name} » retiré du catalogue`);
      load();
    } catch {
      toast.error("Impossible de supprimer le parfum");
    }
  };

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { payment_status: "paid" });
      toast.success("Commande marquée comme payée");
      load();
    } catch {
      toast.error("Impossible de mettre à jour la commande");
    }
  };

  const generateLabel = async (id) => {
    try {
      const { data } = await api.post(`/admin/orders/${id}/label`);
      toast.success(`Étiquette générée — n° ${data.expedition}`);
      if (data.pdf_url) window.open(data.pdf_url, "_blank");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Impossible de générer l'étiquette");
    }
  };

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    navigate("/admin");
  };

  const exportCsv = () => {
    const header = "Date;Référence;Client;Pseudo;Email;Téléphone;Adresse;Livraison;Montant;Total;Statut";
    const rows = orders.map((o) =>
      [o.created_at?.slice(0, 10), o.reference, `${o.firstname} ${o.lastname}`, o.pseudo, o.email, o.phone,
       `${o.address} ${o.postal_code} ${o.city} ${o.country}`, o.shipping_name,
       o.amount.toFixed(2), o.total.toFixed(2), o.payment_status].join(";")
    );
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "commandes-atelier-parfums.csv";
    a.click();
    toast.success("Export CSV téléchargé");
  };

  const kpis = stats ? [
    { label: "Total ventes (payées)", value: formatEUR(stats.total_revenue), icon: Euro, testid: "kpi-total-revenue" },
    { label: "Commandes payées", value: stats.paid_orders_count, icon: CheckCircle2, testid: "kpi-paid-count" },
    { label: "En attente de règlement", value: stats.pending_orders_count, icon: Clock, testid: "kpi-pending-count" },
    { label: "Panier moyen", value: formatEUR(stats.average_order_value), icon: ShoppingBag, testid: "kpi-aov" },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0B0908] text-[#FAF7F2]" data-testid="admin-dashboard">
      <header className="border-b border-[#D4AF37]/15 bg-[#161210]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="" className="h-9 w-9 object-cover rounded-full border border-[#D4AF37]/40" />
            <div>
              <p className="font-display text-lg leading-tight">Tableau de bord</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#6E6763]">Commandes &amp; Ventes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} data-testid="button-refresh-orders" className="p-2.5 rounded-full border border-[#D4AF37]/25 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors" title="Actualiser">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={exportCsv} data-testid="button-export-csv" className="flex items-center gap-2 text-xs rounded-full border border-[#D4AF37]/25 text-[#D4AF37] px-4 py-2.5 hover:bg-[#D4AF37]/10 transition-colors">
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Exporter CSV</span>
            </button>
            <button onClick={logout} data-testid="button-admin-logout" className="flex items-center gap-2 text-xs rounded-full bg-[#C84B67] text-white px-4 py-2.5 hover:bg-[#A83650] transition-colors">
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.testid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="bg-[#161210] rounded-2xl p-5 gold-border-card"
              data-testid={k.testid}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.15em] text-[#A09891]">{k.label}</span>
                <k.icon className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <p className="mt-3 text-3xl font-mono-lux font-semibold gold-text">{k.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-[#161210] rounded-2xl gold-border-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4AF37]/10 flex items-center justify-between">
            <h2 className="font-display text-xl">Commandes reçues</h2>
            <span className="text-xs text-[#6E6763]">{orders.length} commande(s)</span>
          </div>
          {loading ? (
            <p className="p-10 text-center text-sm text-[#6E6763]">Chargement…</p>
          ) : orders.length === 0 ? (
            <p className="p-10 text-center text-sm text-[#6E6763]">Aucune commande pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-admin-orders">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[#6E6763] border-b border-[#D4AF37]/10">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-4 py-3">Client &amp; Pseudo</th>
                    <th className="px-4 py-3">Référence Live</th>
                    <th className="px-4 py-3">Livraison</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Paiement</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const st = STATUS_STYLES[o.payment_status] || STATUS_STYLES.pending;
                    const isOpen = expanded === o.id;
                    return (
                      <FragmentRow key={o.id} o={o} st={st} isOpen={isOpen}
                        onToggle={() => setExpanded(isOpen ? null : o.id)}
                        onMarkPaid={() => markPaid(o.id)}
                        onLabel={() => generateLabel(o.id)} />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[#161210] rounded-2xl gold-border-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4AF37]/10 flex items-center justify-between">
            <h2 className="font-display text-xl flex items-center gap-2"><SprayCan className="h-5 w-5 text-[#D4AF37]" /> Mes parfums (catalogue du site)</h2>
            <span className="text-xs text-[#6E6763]">{products.length} parfum(s)</span>
          </div>
          <form onSubmit={addProduct} className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-[#D4AF37]/10" data-testid="form-add-product">
            <input data-testid="input-product-name" placeholder="Nom du parfum *" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-ref" placeholder="Référence * (ex: OUD-ROYAL-50ML)" value={productForm.ref} onChange={(e) => setProductForm((p) => ({ ...p, ref: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-price" type="number" step="0.01" min="0" placeholder="Prix € *" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-size" placeholder="Contenance (ex: 50 ml)" value={productForm.size} onChange={(e) => setProductForm((p) => ({ ...p, size: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-notes" placeholder="Notes (ex: Oud • Safran • Santal)" value={productForm.notes} onChange={(e) => setProductForm((p) => ({ ...p, notes: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-img" placeholder="URL de la photo (https://…)" value={productForm.img} onChange={(e) => setProductForm((p) => ({ ...p, img: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]" />
            <input data-testid="input-product-desc" placeholder="Description courte" value={productForm.desc} onChange={(e) => setProductForm((p) => ({ ...p, desc: e.target.value }))}
              className="rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-2.5 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37] lg:col-span-1" />
            <button data-testid="button-add-product" type="submit" disabled={savingProduct}
              className="rounded-xl bg-[#D4AF37] text-[#0B0908] py-2.5 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
            </button>
          </form>
          {products.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6E6763]">Aucun parfum pour le moment — ajoutez votre premier parfum ci-dessus, il apparaîtra sur le site.</p>
          ) : (
            <ul className="divide-y divide-[#D4AF37]/5" data-testid="list-admin-products">
              {products.map((p) => (
                <li key={p.id} className="px-6 py-3.5 flex items-center gap-4" data-testid={`product-row-${p.id.slice(0, 8)}`}>
                  {p.img ? (
                    <img src={p.img} alt="" className="h-11 w-11 rounded-lg object-cover border border-[#D4AF37]/25" />
                  ) : (
                    <span className="h-11 w-11 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center"><SprayCan className="h-4 w-4 text-[#D4AF37]" /></span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#FAF7F2] truncate">{p.name} <span className="text-[#6E6763] text-xs">• {p.size}</span></p>
                    <p className="font-mono-lux text-[10px] text-[#D4AF37]">{p.ref}</p>
                  </div>
                  <span className="font-mono-lux text-sm gold-text font-semibold">{formatEUR(p.price)}</span>
                  <button data-testid={`btn-delete-product-${p.id.slice(0, 8)}`} onClick={() => deleteProduct(p.id, p.name)}
                    className="p-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors" title="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-[#161210] rounded-2xl gold-border-card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D4AF37]/10 flex items-center justify-between">
            <h2 className="font-display text-xl">Messages de contact</h2>
            <span className="text-xs text-[#6E6763]">{messages.length} message(s)</span>
          </div>
          {messages.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6E6763]">Aucun message pour le moment.</p>
          ) : (
            <ul className="divide-y divide-[#D4AF37]/5" data-testid="list-admin-messages">
              {messages.map((m) => (
                <li key={m.id} className="px-6 py-4" data-testid={`message-${m.id.slice(0, 8)}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-[#FAF7F2]">{m.name} <span className="text-[#D4AF37] text-xs">• {m.email}</span></p>
                    <span className="font-mono-lux text-[10px] text-[#6E6763]">{m.created_at?.slice(0, 16).replace("T", " ")}</span>
                  </div>
                  <p className="text-xs text-[#A09891] mt-1.5 leading-relaxed">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function FragmentRow({ o, st, isOpen, onToggle, onMarkPaid, onLabel }) {
  return (
    <>
      <tr className="border-b border-[#D4AF37]/5 hover:bg-white/[0.02] cursor-pointer" onClick={onToggle} data-testid={`order-row-${o.id.slice(0, 8)}`}>
        <td className="px-6 py-4 font-mono-lux text-xs text-[#A09891]">{o.created_at?.slice(0, 10)}</td>
        <td className="px-4 py-4">
          <p className="text-[#FAF7F2]">{o.firstname} {o.lastname}</p>
          {o.pseudo && <p className="text-xs text-[#D4AF37]">{o.pseudo}</p>}
        </td>
        <td className="px-4 py-4 font-mono-lux text-xs">{o.reference}</td>
        <td className="px-4 py-4 text-xs text-[#A09891]">
          {o.shipping_name}
          {o.group_id && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
              <PackagePlus className="h-3 w-3" /> Groupé
            </span>
          )}
        </td>
        <td className="px-4 py-4 text-right font-mono-lux font-semibold">{formatEUR(o.total)}</td>
        <td className="px-4 py-4">
          <span className={`text-xs border rounded-full px-3 py-1 ${st.cls}`} data-testid={`status-${o.id.slice(0, 8)}`}>{st.label}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            {o.payment_status !== "paid" && (
              <button
                data-testid={`btn-toggle-paid-${o.id.slice(0, 8)}`}
                onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}
                className="text-xs rounded-full border border-emerald-500/40 text-emerald-400 px-3 py-1.5 hover:bg-emerald-500/10"
              >
                Marquer payée
              </button>
            )}
            {o.payment_status === "paid" && o.shipping_method === "mondial_relay" && o.relay_id && (
              <button
                data-testid={`btn-label-${o.id.slice(0, 8)}`}
                onClick={(e) => { e.stopPropagation(); onLabel(); }}
                className="text-xs rounded-full border border-[#D4AF37]/40 text-[#D4AF37] px-3 py-1.5 hover:bg-[#D4AF37]/10 flex items-center gap-1.5"
              >
                <Tag className="h-3 w-3" /> {o.label_url ? "Étiquette" : "Générer étiquette"}
              </button>
            )}
            <ChevronDown className={`h-4 w-4 text-[#6E6763] transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-[#D4AF37]/10 bg-white/[0.02]" data-testid={`order-details-${o.id.slice(0, 8)}`}>
          <td colSpan={7} className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[#6E6763] uppercase tracking-widest mb-1">Contact</p>
                <p>{o.email}</p>
                <p>{o.phone}</p>
              </div>
              <div>
                <p className="text-[#6E6763] uppercase tracking-widest mb-1">Livraison</p>
                <p>{o.address}</p>
                <p>{o.postal_code} {o.city}, {o.country}</p>
                {o.relay_name && <p className="text-[#D4AF37] mt-1">Point Relais : {o.relay_name}</p>}
                {o.group_id && <p className="text-emerald-400 mt-1">↳ Regroupée dans le colis de la commande précédente</p>}
              </div>
              <div>
                <p className="text-[#6E6763] uppercase tracking-widest mb-1">Détail montants</p>
                <p>Articles : {formatEUR(o.amount)} — Livraison : {o.shipping_cost === 0 ? "Offerte" : formatEUR(o.shipping_cost)}</p>
                <p className="text-[#D4AF37] font-mono-lux">Total : {formatEUR(o.total)}</p>
                {o.expedition_num && (
                  <p className="mt-1">
                    Suivi : <span className="font-mono-lux text-emerald-400">{o.expedition_num}</span>{" "}
                    {o.label_url && (
                      <a href={o.label_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-[#D4AF37]" data-testid={`label-link-${o.id.slice(0, 8)}`}>
                        PDF <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
