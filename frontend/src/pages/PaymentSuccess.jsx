import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api, formatEUR } from "@/lib/api";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "loading", total: null });

  useEffect(() => {
    if (!sessionId) return setState({ status: "error", total: null });
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") return setState({ status: "paid", total: data.total });
        if (tries++ < 15) return setTimeout(poll, 2000);
        setState({ status: "pending", total: data.total });
      } catch {
        setState({ status: "error", total: null });
      }
    };
    poll();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0B0908] flex items-center justify-center px-4 noise-overlay relative" data-testid="payment-success-page">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-md w-full bg-[#161210] rounded-2xl p-10 text-center gold-border-card"
      >
        <img src="/assets/logo.png" alt="L'Atelier des parfums" className="h-16 w-16 object-cover rounded-full border border-[#D4AF37]/40 mx-auto" />
        {state.status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin mx-auto mt-8" />
            <h1 className="font-display text-2xl text-[#FAF7F2] mt-4">Confirmation du paiement…</h1>
            <p className="text-sm text-[#A09891] mt-2">Nous vérifions votre transaction auprès de Stripe.</p>
          </>
        )}
        {state.status === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mt-8" data-testid="payment-confirmed-icon" />
            <h1 className="font-display text-3xl text-[#FAF7F2] mt-4">Merci pour votre commande</h1>
            <p className="text-sm text-[#A09891] mt-3 leading-relaxed">
              Votre paiement de <span className="gold-text font-mono-lux font-semibold">{formatEUR(state.total)}</span> est confirmé.
              L'Atelier des parfums prépare votre envoi — vous recevrez le suivi par e-mail.
            </p>
          </>
        )}
        {state.status === "pending" && (
          <>
            <Loader2 className="h-10 w-10 text-[#D4AF37] mx-auto mt-8" />
            <h1 className="font-display text-2xl text-[#FAF7F2] mt-4">Paiement en cours de traitement</h1>
            <p className="text-sm text-[#A09891] mt-2">La confirmation peut prendre quelques instants.</p>
          </>
        )}
        {state.status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-[#C84B67] mx-auto mt-8" />
            <h1 className="font-display text-2xl text-[#FAF7F2] mt-4">Vérification impossible</h1>
            <p className="text-sm text-[#A09891] mt-2">Contactez la boutique si le montant a été débité.</p>
          </>
        )}
        <Link
          to="/"
          data-testid="back-home-link"
          className="inline-block mt-8 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] px-6 py-3 text-sm hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors"
        >
          Retour à la boutique
        </Link>
      </motion.div>
    </div>
  );
}
