import Link from "next/link";
import { Bricolage_Grotesque, Manrope, Space_Mono } from "next/font/google";
import { LoyaLogo } from "@/components/LoyaLogo";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export default function Home() {
  return (
    <main
      className={`${bricolage.variable} ${manrope.variable} ${spaceMono.variable} relative min-h-screen overflow-hidden bg-[#fbf1e3] font-[family-name:var(--font-manrope)]`}
    >
      {/* SOLEIL */}
      <div className="pointer-events-none absolute -right-24 -top-28 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd166,#f9a826_60%,#f4801f)] opacity-90" />

      {/* NAV */}
      <header className="relative flex items-center justify-between px-6 py-7 sm:px-14">
        <LoyaLogo size={48} />
        
        <Link
          href="/login"
          className="border-b-2 border-[#1a1208] pb-0.5 text-base font-bold text-[#1a1208] no-underline"
        >
          Se connecter
        </Link>
      </header>

      {/* HERO */}
      <section className="relative max-w-3xl px-6 pb-16 pt-8 sm:px-14 sm:pb-20">
        <p className="mb-6 font-[family-name:var(--font-mono)] text-[13px] font-bold uppercase tracking-[0.1em] text-[#b45309]">
          Gestion locative · sans effort
        </p>

        <h1 className="mb-6 font-[family-name:var(--font-bricolage)] text-4xl font-extrabold leading-[1.02] tracking-[-0.025em] text-[#1a1208] sm:text-[58px]">
          Envoyez vos relances et quittances{" "}
          <span className="text-[#e8590c]">en un clic</span>, ou laissez l&apos;appli le faire{" "}
          <em className="not-italic italic text-[#e8590c]">automatiquement</em>.
        </h1>

        <p className="mb-2 text-xl font-extrabold text-[#1a1208] sm:text-[26px] sm:leading-snug">
          Simple à prendre en main, <span className="text-[#e8590c]">puissant</span> au quotidien.
        </p>
        <p className="mb-9 text-base font-semibold text-[#b45309] sm:text-lg">
          Vous, vous pouvez retourner bronzer. 🌞
        </p>

        {/* BOUTON */}
        <div className="mb-11">
          <Link
            href="/login?view=signup"
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#1a1208] px-12 py-5 text-lg font-bold text-[#fbf1e3] no-underline transition hover:opacity-90"
          >
            Créer un compte <span className="text-xl">→</span>
          </Link>
        </div>

        {/* GARANTIES */}
        <ul className="flex flex-wrap gap-x-8 gap-y-2 font-[family-name:var(--font-mono)] text-[13.5px] font-bold text-[#1a1208]">
          <li>✓ Sans engagement</li>
          <li>✓ Quittances conformes</li>
          <li>✓ Relances auto</li>
        </ul>
      </section>
    </main>
  );
}
