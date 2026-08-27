import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SiteNav, SiteFooter } from "@/components/SiteChrome";

const VALUES = [
  { num: "I", title: "Authenticité", text: "Des essences sourcées avec exigence, des formules assumées, zéro compromis sur la qualité." },
  { num: "II", title: "Passion", text: "Chaque live est un rendez-vous : on vous raconte les notes, l'inspiration, les coulisses de l'atelier." },
  { num: "III", title: "Élégance", text: "Du flacon à l'emballage d'expédition, tout est pensé comme un geste de haute parfumerie." },
];

export default function Histoire() {
  return (
    <div className="bg-[#0B0908] min-h-screen" data-testid="histoire-page">
      <SiteNav />
      <main className="pt-32 md:pt-36 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="text-xs font-mono-lux uppercase tracking-[0.3em] text-[#D4AF37]">Notre Histoire</span>
            <h1 className="font-display text-4xl sm:text-5xl text-[#FAF7F2] mt-3 leading-tight">
              Une maison née d'un <span className="italic gold-text">amour du sillage</span>
            </h1>
            <div className="mt-6 space-y-4 text-sm text-[#B9B0A6] leading-relaxed">
              <p>
                L'Atelier des parfums est né d'une conviction simple : un grand parfum n'a pas besoin d'un grand prix.
                Depuis notre atelier, nous composons des fragrances généreuses, inspirées des plus belles maisons,
                avec des concentrations qui tiennent toute la journée.
              </p>
              <p>
                C'est en live que tout a pris son sens. Devant vous, en direct, nous présentons chaque création,
                répondons à vos questions et vous laissons choisir en connaissance de cause. Cette proximité est
                notre signature — et votre confiance, notre plus belle récompense.
              </p>
              <p>
                Chaque commande est préparée à la main, emballée avec soin et expédiée
                via Mondial Relay en Point Relais.
              </p>
            </div>
            <Link
              to="/catalogue"
              data-testid="histoire-cta-catalogue"
              className="inline-block mt-8 rounded-full bg-[#D4AF37] text-[#0B0908] px-7 py-3.5 text-sm font-medium hover:bg-[#F3EAD3] transition-colors"
            >
              Découvrir la collection
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <img
              src="https://images.pexels.com/photos/15096784/pexels-photo-15096784.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="L'atelier"
              className="rounded-2xl gold-border-card object-cover h-[480px] w-full"
            />
            <img
              src="/assets/logo.png"
              alt=""
              className="absolute -bottom-8 -left-8 h-28 w-28 object-cover rounded-full border-2 border-[#D4AF37]/50 shadow-2xl hidden sm:block animate-float-slow"
            />
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-24 grid grid-cols-1 md:grid-cols-3 gap-10">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="border-t border-[#D4AF37]/25 pt-6"
              data-testid={`value-${v.num}`}
            >
              <span className="font-display text-2xl gold-text">{v.num}.</span>
              <h3 className="font-display text-2xl text-[#FAF7F2] mt-3">{v.title}</h3>
              <p className="text-sm text-[#A09891] mt-3 leading-relaxed">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
