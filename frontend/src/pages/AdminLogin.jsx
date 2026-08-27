import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/login", { email, password });
      toast.success("Connexion réussie");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0908] flex items-center justify-center px-4 noise-overlay relative" data-testid="admin-login-page">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-sm w-full bg-[#161210] rounded-2xl p-8 gold-border-card"
      >
        <div className="text-center">
          <img src="/assets/logo.png" alt="L'Atelier des parfums" className="h-16 w-16 object-cover rounded-full border border-[#D4AF37]/40 mx-auto" />
          <h1 className="font-display text-2xl text-[#FAF7F2] mt-4">Espace Administration</h1>
          <p className="text-xs text-[#6E6763] mt-1 uppercase tracking-[0.2em]">L'Atelier des parfums</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">Identifiant admin</span>
            <input
              data-testid="input-admin-username"
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@atelier-parfums.fr"
              className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]"
            />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">Mot de passe</span>
            <input
              data-testid="input-admin-password"
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]"
            />
          </label>
          <button
            data-testid="button-admin-login"
            type="submit" disabled={loading}
            className="w-full rounded-full bg-[#D4AF37] text-[#0B0908] py-3.5 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Se connecter
          </button>
        </form>
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-[#6E6763] hover:text-[#D4AF37]" data-testid="back-to-shop-link">← Retour à la boutique</Link>
        </div>
      </motion.div>
    </div>
  );
}
