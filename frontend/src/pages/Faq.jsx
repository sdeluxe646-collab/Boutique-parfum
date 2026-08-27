import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";

const FAQS = [
  {
    q: "Quels sont les modes et tarifs de livraison ?",
    a: "Chronopost Relais Express 24h : 5,99 € — Chronopost Domicile Express 24h (contre signature) : 9,90 € — Mondial Relay Point Relais (3 à 5 jours ouvrés) : 4,99 €. Toute commande payée avant 15h est expédiée le jour même depuis notre atelier.",
  },
  {
    q: "J'ai commandé plusieurs fois pendant un live, vais-je payer les frais de port à chaque fois ?",
    a: "Non ! Si vous avez déjà une commande en cours (payée ou en attente, moins de 7 jours), entrez le même e-mail : l'option « Ajouter à mon colis en cours — port offert » apparaît automatiquement à l'étape 2 du formulaire. Tout part dans un seul colis.",
  },
  {
    q: "Comment suivre mon colis ?",
    a: "Dès l'expédition, vous recevez votre numéro de suivi par e-mail. Pour les envois Mondial Relay, le suivi est disponible sur mondialrelay.fr ; pour Chronopost, sur chronopost.fr.",
  },
  {
    q: "Puis-je retourner un parfum ?",
    a: "Oui. Vous disposez de 14 jours après réception pour nous retourner tout flacon non ouvert et non descellé, dans son emballage d'origine. Contactez-nous via la page Contact pour obtenir l'étiquette retour. Le remboursement est effectué sous 5 jours ouvrés après réception.",
  },
  {
    q: "Le paiement est-il sécurisé ?",
    a: "Absolument. Tous les paiements sont traités par Stripe (VISA, Mastercard, CB) avec chiffrement SSL. Nous ne voyons ni ne stockons jamais vos données bancaires.",
  },
  {
    q: "Les parfums sont-ils authentiques ?",
    a: "Toutes nos créations sont composées et remplies dans notre atelier, avec des essences de haute qualité. Authenticité, Passion, Élégance : c'est la devise de la maison, et chaque flacon est vérifié avant expédition.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="faq-page">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 md:pt-36 pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center">
          <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">FAQ</span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#FAF7F2] mt-3">Livraison, retours & <span className="italic gold-text">questions fréquentes</span></h1>
        </motion.div>

        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="bg-[#161210] rounded-2xl gold-border-card overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  data-testid={`faq-question-${i}`}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-display text-lg text-[#FAF7F2]">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 text-[#D4AF37] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="px-5 pb-5 text-sm text-[#A09891] leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[#A09891]">Une autre question ?</p>
          <Link to="/contact" data-testid="faq-cta-contact" className="inline-block mt-4 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] px-6 py-3 text-sm hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors">
            Contactez-nous
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
