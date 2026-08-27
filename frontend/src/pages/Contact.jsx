import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Instagram, Music2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";
import { api, formatApiError } from "@/lib/api";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return toast.error("Veuillez remplir tous les champs.");
    }
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Message envoyé ! Nous vous répondrons très vite.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="contact-page">
      <SiteNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 md:pt-36 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">Contact</span>
          <h1 className="font-display text-4xl sm:text-5xl text-[#FAF7F2] mt-3">Une question ? <span className="italic gold-text">Écrivez-nous.</span></h1>
          <p className="text-sm text-[#A09891] mt-4 leading-relaxed max-w-md">
            Suivi de commande, conseil parfum, question sur un live : l'équipe de l'atelier vous répond
            personnellement, en général sous 24h.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Mail, label: "E-mail", value: "lateliersparfum@gmail.com", href: "mailto:lateliersparfum@gmail.com", testid: "contact-email" },
              { icon: Instagram, label: "Instagram", value: "@atelierdesparfums", href: "https://instagram.com", testid: "contact-instagram" },
              { icon: Music2, label: "TikTok (lives)", value: "@atelierdesparfums", href: "https://tiktok.com", testid: "contact-tiktok" },
            ].map((c) => (
              <a key={c.label} href={c.href} target="_blank" rel="noreferrer" data-testid={c.testid}
                className="flex items-center gap-4 bg-[#161210] rounded-2xl p-5 gold-border-card hover:border-[#D4AF37]/60 transition-colors">
                <span className="h-11 w-11 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                  <c.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.15em] text-[#6E6763]">{c.label}</span>
                  <span className="text-sm text-[#F3EAD3]">{c.value}</span>
                </span>
              </a>
            ))}
          </div>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="bg-[#161210] rounded-2xl p-8 gold-border-card self-start"
          data-testid="contact-form"
        >
          <h2 className="font-display text-2xl text-[#FAF7F2]">Formulaire de contact</h2>
          <div className="mt-6 space-y-4">
            {[
              { key: "name", label: "Votre nom", type: "text", testid: "input-contact-name", placeholder: "Marine Dupont" },
              { key: "email", label: "Votre e-mail", type: "email", testid: "input-contact-email", placeholder: "marine@example.com" },
            ].map((f) => (
              <label key={f.key} className="block">
                <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">{f.label}</span>
                <input
                  data-testid={f.testid} type={f.type} placeholder={f.placeholder}
                  value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37]"
                />
              </label>
            ))}
            <label className="block">
              <span className="block text-xs uppercase tracking-[0.12em] text-[#A09891] mb-1.5">Votre message</span>
              <textarea
                data-testid="input-contact-message" rows={5} placeholder="Bonjour, je souhaiterais…"
                value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full rounded-xl bg-[#0B0908] border border-[#D4AF37]/25 px-4 py-3 text-sm text-[#FAF7F2] placeholder-[#6E6763] outline-none focus:border-[#D4AF37] resize-none"
              />
            </label>
            <button
              data-testid="button-contact-send" type="submit" disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] text-[#0B0908] py-3.5 text-sm font-semibold hover:bg-[#F3EAD3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer le message
            </button>
          </div>
        </motion.form>
      </main>
      <SiteFooter />
    </div>
  );
}
