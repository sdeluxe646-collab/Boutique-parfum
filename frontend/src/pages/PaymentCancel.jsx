import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-[#0B0908] flex items-center justify-center px-4" data-testid="payment-cancel-page">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-md w-full bg-[#161210] rounded-2xl p-10 text-center gold-border-card"
      >
        <XCircle className="h-12 w-12 text-[#C84B67] mx-auto" />
        <h1 className="font-display text-3xl text-[#FAF7F2] mt-6">Paiement annulé</h1>
        <p className="text-sm text-[#A09891] mt-3 leading-relaxed">
          Aucun montant n'a été débité. Votre commande reste enregistrée en attente —
          vous pouvez reprendre le règlement quand vous le souhaitez.
        </p>
        <Link
          to="/"
          data-testid="retry-payment-link"
          className="inline-block mt-8 rounded-full bg-[#D4AF37] text-[#0B0908] px-6 py-3 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors"
        >
          Reprendre ma commande
        </Link>
      </motion.div>
    </div>
  );
}
