import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, BadgeCheck, Lock, Sparkles } from "lucide-react";
import CheckoutForm from "@/components/CheckoutForm";

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
  "Chronopost 24h",
  "Mondial Relay",
  "Authenticité • Passion • Élégance",
];

const CHAPTERS = [
  { num: "01", title: "Choisissez en direct", text: "Repérez votre référence pendant le live et notez le montant annoncé." },
  { num: "02", title: "Réglez en un instant", text: "Formulaire rapide, livraison Chronopost ou Mondial Relay, paiement carte bancaire via Stripe." },
  { num: "03", title: "Recevez votre parfum", text: "Expédition soignée depuis notre atelier, suivi de commande par e-mail." },
];

export default function Home() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.06]);

  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="home-page">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0B0908]/70 border-b border-[#D4AF37]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3" data-testid="nav-brand">
            <img src="/assets/logo.png" alt="L'Atelier des parfums" className="h-10 w-10 object-cover rounded-full border border-[#D4AF37]/40" />
            <span className="font-display text-lg tracking-wide text-[#F3EAD3]">L'Atelier <span className="italic gold-text">des parfums</span></span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-[#A09891]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live en cours
            </span>
            <a
              href="/admin"
              data-testid="nav-admin-link"
              className="text-xs tracking-[0.15em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 rounded-full px-4 py-2 hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors"
            >
              Espace Admin
            </a>
          </div>
        </div>
      </header>

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
            Finalisez votre commande en direct de L'Atelier des parfums. Expédition express
            Chronopost &amp; Mondial Relay, paiement 100% sécurisé par carte bancaire.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#commande"
              data-testid="hero-cta-order"
              className="rounded-full bg-[#D4AF37] text-[#0B0908] px-7 py-3.5 text-sm font-medium tracking-wide hover:bg-[#F3EAD3] transition-colors"
            >
              Commander maintenant
            </a>
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

      {/* Checkout */}
      <section id="commande" className="bg-[#FAF7F2] rounded-t-[2.5rem] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-10"
          >
            <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#C84B67]">Finaliser ma commande</span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#1A1513] mt-2">Commande Live — L'Atelier des parfums</h2>
            <div className="hairline w-48 mt-4" style={{ background: "linear-gradient(90deg,#C84B67,transparent)" }} />
          </motion.div>
          <CheckoutForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B0908] border-t border-[#D4AF37]/15 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="" className="h-9 w-9 object-cover rounded-full border border-[#D4AF37]/40" />
            <span className="font-display text-[#F3EAD3]">L'Atelier des parfums</span>
          </div>
          <p className="text-xs text-[#6E6763]">Authenticité • Passion • Élégance — Paiement sécurisé par Stripe</p>
        </div>
      </footer>
    </div>
  );
}
