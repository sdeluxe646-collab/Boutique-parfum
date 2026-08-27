import { Link, NavLink } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/catalogue", label: "Catalogue" },
  { to: "/histoire", label: "Notre Histoire" },
  { to: "/faq", label: "FAQ Livraison" },
  { to: "/contact", label: "Contact" },
];

export const SiteNav = () => (
  <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0B0908]/70 border-b border-[#D4AF37]/15">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="nav-brand">
        <img src="/assets/logo.png" alt="L'Atelier des parfums" className="h-10 w-10 object-cover rounded-full border border-[#D4AF37]/40" />
        <span className="font-display text-lg tracking-wide text-[#F3EAD3] hidden sm:block">
          L'Atelier <span className="italic gold-text">des parfums</span>
        </span>
      </Link>
      <nav className="hidden md:flex items-center gap-6">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            data-testid={`nav-link-${l.label.toLowerCase().replace(/\s/g, "-")}`}
            className={({ isActive }) =>
              `text-xs uppercase tracking-[0.15em] transition-colors ${isActive ? "text-[#D4AF37]" : "text-[#A09891] hover:text-[#F3EAD3]"}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/commande"
          data-testid="nav-cta-order"
          className="text-xs font-medium bg-[#D4AF37] text-[#0B0908] rounded-full px-4 py-2 hover:bg-[#F3EAD3] transition-colors"
        >
          Commander
        </Link>
        <Link
          to="/admin"
          data-testid="nav-admin-link"
          className="text-xs tracking-[0.15em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 rounded-full px-4 py-2 hover:bg-[#D4AF37] hover:text-[#0B0908] transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
    <nav className="md:hidden flex items-center gap-4 overflow-x-auto px-4 pb-2">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `text-[11px] uppercase tracking-[0.12em] whitespace-nowrap ${isActive ? "text-[#D4AF37]" : "text-[#A09891]"}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  </header>
);

export const SiteFooter = () => (
  <footer className="bg-[#0B0908] border-t border-[#D4AF37]/15 py-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src="/assets/logo.png" alt="" className="h-9 w-9 object-cover rounded-full border border-[#D4AF37]/40" />
        <span className="font-display text-[#F3EAD3]">L'Atelier des parfums</span>
      </div>
      <div className="flex items-center gap-5 text-xs text-[#6E6763]">
        <Link to="/faq" className="hover:text-[#D4AF37]">Livraison &amp; Retours</Link>
        <Link to="/contact" className="hover:text-[#D4AF37]">Contact</Link>
        <Link to="/admin" className="hover:text-[#D4AF37]">Admin</Link>
      </div>
      <p className="text-xs text-[#6E6763]">Authenticité • Passion • Élégance — Paiement sécurisé Stripe</p>
    </div>
  </footer>
);
