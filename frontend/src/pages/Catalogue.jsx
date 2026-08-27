import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { api, formatEUR } from "@/lib/api";

export default function Catalogue() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    api.get("/products").then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="catalogue-page">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 md:pt-36 pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">La Collection</span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#FAF7F2] mt-3">Nos parfums d'atelier</h1>
          <p className="text-sm text-[#A09891] mt-4 max-w-xl leading-relaxed">
            Cliquez sur « Commander » et le formulaire sera pré-rempli avec la référence et le montant du parfum.
          </p>
        </motion.div>

        {products === null ? (
          <p className="mt-16 text-center text-sm text-[#6E6763]">Chargement…</p>
        ) : products.length === 0 ? (
          <div className="mt-16 text-center bg-[#161210] rounded-2xl p-12 gold-border-card" data-testid="catalogue-empty">
            <p className="font-display text-2xl text-[#FAF7F2]">La collection arrive très bientôt</p>
            <p className="text-sm text-[#A09891] mt-3 max-w-md mx-auto">
              Les parfums sont en cours de mise en ligne. En attendant, vous pouvez commander la référence
              annoncée pendant le live via le formulaire de commande.
            </p>
            <Link to="/commande" data-testid="catalogue-empty-cta" className="inline-block mt-6 rounded-full bg-[#D4AF37] text-[#0B0908] px-7 py-3.5 text-sm font-medium hover:bg-[#F3EAD3] transition-colors">
              Commander une référence du live
            </Link>
          </div>
        ) : (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              className="group bg-[#161210] rounded-2xl overflow-hidden gold-border-card"
              data-testid={`product-card-${p.id}`}
            >
              <div className="relative h-72 overflow-hidden">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-4 left-4 text-[10px] font-mono-lux uppercase tracking-[0.2em] bg-[#0B0908]/80 backdrop-blur text-[#D4AF37] px-3 py-1.5 rounded-full border border-[#D4AF37]/30">
                  {p.ref}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl text-[#FAF7F2]">{p.name}</h2>
                    <p className="text-xs text-[#D4AF37] mt-1 italic font-display">{p.notes}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-lux text-xl font-semibold gold-text">{formatEUR(p.price)}</p>
                    <p className="text-[10px] text-[#6E6763]">{p.size}</p>
                  </div>
                </div>
                <p className="text-sm text-[#A09891] mt-3 leading-relaxed">{p.desc}</p>
                <Link
                  to={`/commande?ref=${encodeURIComponent(p.ref)}&montant=${p.price}`}
                  data-testid={`product-order-${p.id}`}
                  className="mt-5 w-full rounded-full border border-[#D4AF37]/40 text-[#D4AF37] py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors"
                >
                  Commander <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
