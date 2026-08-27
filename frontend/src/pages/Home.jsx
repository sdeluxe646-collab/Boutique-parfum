import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, BadgeCheck, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { api, formatEUR } from "@/lib/api";

const MaskedLine = ({ children, delay = 0, className = "" }) => (
  <span className="block overflow-hidden">
    <motion.span
      className={`block ${className}`}
      initial={{ y: "110%" }}
      animate={{ y: 0 }}
      transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.span>
  </span>
);

const MARQUEE_ITEMS = [
  "Haute Parfumerie",
  "Live Shopping",
  "Paiement Sécurisé Stripe",
  "Mondial Relay Point Relais",
  "Port Offert Colis Groupé",
  "Authenticité • Passion • Élégance",
];

const CHAPTERS = [
  { num: "01", title: "Choisissez en direct", text: "Repérez votre référence pendant le live et notez le montant annoncé." },
  { num: "02", title: "Réglez en un instant", text: "Formulaire rapide, livraison Mondial Relay en Point Relais, paiement carte bancaire via Stripe." },
  { num: "03", title: "Recevez votre parfum", text: "Expédition soignée depuis notre atelier, suivi de commande par e-mail." },
];

export default function Home() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.06]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get("/products").then(({ data }) => setFeatured(data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="home-page">
      <SiteNav />

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden noise-overlay">
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img src="/assets/logo.png" alt="" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0908] via-[#0B0908]/55 to-[#0B0908]/30" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-40 w-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-6"
          >
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">Règlement Live Shopping</span>
          </motion.div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#FAF7F2] leading-[1.05] max-w-3xl">
            <MaskedLine delay={0.35}>Votre parfum du live,</MaskedLine>
            <MaskedLine delay={0.5} className="italic gold-text">réglé en un instant.</MaskedLine>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.8 }}
            className="mt-6 max-w-xl text-sm sm:text-base text-[#B9B0A6] leading-relaxed"
          >
            Finalisez votre commande en direct de L'Atelier des parfums. Livraison
            Mondial Relay en Point Relais, paiement 100% sécurisé par carte bancaire.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/commande"
              data-testid="hero-cta-order"
              className="rounded-full bg-[#D4AF37] text-[#0B0908] px-7 py-3.5 text-sm font-medium tracking-wide hover:bg-[#F3EAD3] transition-colors"
            >
              Commander maintenant
            </Link>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: BadgeCheck, label: "Vendeur vérifié" },
                { icon: ShieldCheck, label: "Paiement sécurisé" },
                { icon: Lock, label: "Données protégées" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-[#F3EAD3] bg-white/5 border border-[#D4AF37]/25 rounded-full px-3 py-1.5 backdrop-blur">
                  <Icon className="h-3.5 w-3.5 text-[#D4AF37]" /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="border-y border-[#D4AF37]/20 bg-[#0B0908] py-4 overflow-hidden" data-testid="marquee-strip">
        <div className="flex whitespace-nowrap animate-marquee-lux w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={`${copy}-${i}`} className="flex items-center">
                  <span className="font-display italic text-lg text-[#F3EAD3]/80 px-6">{item}</span>
                  <span className="text-[#D4AF37] text-xs">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Chapters */}
      <section className="bg-[#0B0908] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          {CHAPTERS.map((c, i) => (
            <motion.div
              key={c.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="border-t border-[#D4AF37]/25 pt-6"
              data-testid={`chapter-${c.num}`}
            >
              <span className="font-mono-lux text-xs text-[#D4AF37] tracking-[0.3em]">{c.num}</span>
              <h3 className="font-display text-2xl text-[#FAF7F2] mt-3">{c.title}</h3>
              <p className="text-sm text-[#A09891] mt-3 leading-relaxed">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Catalogue preview */}
      {featured.length > 0 && (
      <section className="bg-[#FAF7F2] rounded-t-[2.5rem] relative py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex items-end justify-between gap-6 flex-wrap"
          >
            <div>
              <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#C84B67]">La Collection</span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#1A1513] mt-2">Les iconiques de l'atelier</h2>
            </div>
            <Link
              to="/catalogue"
              data-testid="home-cta-catalogue"
              className="flex items-center gap-2 text-sm text-[#8C1C35] border-b border-[#C84B67]/40 pb-1 hover:text-[#C84B67] transition-colors"
            >
              Voir tout le catalogue <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {featured.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group"
                data-testid={`home-product-${p.id}`}
              >
                <div className="relative h-80 rounded-2xl overflow-hidden">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute bottom-4 left-4 bg-[#0B0908]/85 backdrop-blur text-[#F3EAD3] font-mono-lux text-sm px-4 py-2 rounded-full border border-[#D4AF37]/30">
                    {formatEUR(p.price)}
                  </span>
                </div>
                <h3 className="font-display text-xl text-[#1A1513] mt-4">{p.name}</h3>
                <p className="text-xs text-[#6E6763] italic mt-1">{p.notes}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Histoire teaser */}
      <section className={`bg-[#FAF7F2] pb-20 ${featured.length === 0 ? "rounded-t-[2.5rem] pt-16 md:pt-24" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="bg-[#161210] rounded-[2rem] p-8 sm:p-12 gold-border-card grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          >
            <div>
              <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">Notre Histoire</span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#FAF7F2] mt-3 leading-tight">
                Une maison née d'un <span className="italic gold-text">amour du sillage</span>
              </h2>
              <p className="text-sm text-[#A09891] mt-4 leading-relaxed">
                Des créations composées dans notre atelier, présentées en direct pendant nos lives,
                préparées à la main et expédiées en 24h. Authenticité, passion, élégance.
              </p>
              <Link
                to="/histoire"
                data-testid="home-cta-histoire"
                className="inline-block mt-6 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] px-6 py-3 text-sm hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors"
              >
                Découvrir notre histoire
              </Link>
            </div>
            <img
              src="https://images.pexels.com/photos/15096784/pexels-photo-15096784.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="L'atelier"
              className="rounded-2xl object-cover h-72 w-full"
            />
          </motion.div>
        </div>
      </section>

      {/* CTA commande */}
      <section className="bg-[#0B0908] border-t border-[#D4AF37]/15 py-20 text-center noise-overlay relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto px-4"
        >
          <h2 className="font-display text-3xl sm:text-4xl text-[#FAF7F2]">Prête à commander votre <span className="italic gold-text">parfum du live</span> ?</h2>
          <p className="text-sm text-[#A09891] mt-4">Référence, montant, livraison, paiement sécurisé : 2 minutes chrono.</p>
          <Link
            to="/commande"
            data-testid="home-cta-commande"
            className="inline-block mt-8 rounded-full bg-[#D4AF37] text-[#0B0908] px-8 py-4 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors"
          >
            Finaliser ma commande
          </Link>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
}
