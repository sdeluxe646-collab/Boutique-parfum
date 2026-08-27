import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("8 caractères minimum.");
    if (password !== confirm) return toast.error("Les deux mots de passe ne correspondent pas.");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Mot de passe mis à jour — connectez-vous !");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0908] flex items-center justify-center px-4 noise-overlay relative" data-testid="reset-password-page">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-sm w-full bg-[#161210] rounded-2xl p-8 gold-border-card"
      >
        <div className="text-center">
          <img src="/assets/logo.png" alt="L'Atelier des parfums" className="h-16 w-16 object-cover rounded-full border border-[#D4AF37]/40 mx-auto" />
          <h1 className="font-display text-2xl text-[#FAF7F2] mt-4">Nouveau mot de passe</h1>
          <p className="text-xs text-[#6E6763] mt-1">Lien valable 1 heure, à usage unique</p>
        </div>
        {!token ? (
          <p className="mt-6 text-sm text-[#C84B67] text-center" data-testid="reset-missing-token">
            Lien incomplet — utilisez le lien reçu par e-mail.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">Nouveau mot de passe</span>
              <input
                data-testid="input-new-password" type="password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum"
                className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]"
              />
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">Confirmer</span>
              <input
                data-testid="input-confirm-password" type="password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Retapez le mot de passe"
                className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]"
              />
            </label>
            <button
              data-testid="button-reset-password" type="submit" disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] text-[#0B0908] py-3.5 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Mettre à jour
            </button>
          </form>
        )}
        <div className="text-center mt-6">
          <Link to="/admin" className="text-xs text-[#6E6763] hover:text-[#D4AF37]" data-testid="back-to-login-link">← Retour à la connexion</Link>
        </div>
      </motion.div>
    </div>
  );
}
