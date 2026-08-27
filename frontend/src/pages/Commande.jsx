import { motion } from "framer-motion";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import CheckoutForm from "@/components/CheckoutForm";

export default function Commande() {
  return (
    <div className="bg-[#FAF7F2] min-h-screen" data-testid="commande-page">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-36 pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mb-10">
          <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#C84B67]">Finaliser ma commande</span>
          <h1 className="font-display text-3xl sm:text-4xl text-[#1A1513] mt-2">Commande Live — L'Atelier des parfums</h1>
          <p className="text-sm text-[#6E6763] mt-2">
            Indiquez le montant et la référence annoncés pendant le live, ou arrivez depuis le catalogue : tout est pré-rempli.
          </p>
        </motion.div>
        <CheckoutForm />
      </main>
      <SiteFooter />
    </div>
  );
}
