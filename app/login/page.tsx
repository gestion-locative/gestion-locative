"use client";
console.log("DASHBOARD CHARGÉ");

import { useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bricolage_Grotesque, Manrope, Space_Mono } from "next/font/google";
import Link from "next/link";


const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bricolage" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

type View = "login" | "signup" | "forgot" | "confirm";

/* ---------- UI partagée ---------- */

const inputClass =
  "w-full rounded-xl border-2 border-[#e6d6bb] bg-[#fdf8ef] px-4 py-3 text-[15px] text-[#1a1208] placeholder:text-[#a89372] outline-none transition focus:border-[#1a1208]";

const primaryBtn =
  "w-full rounded-full bg-[#1a1208] px-6 py-4 text-base font-bold text-[#fbf1e3] transition hover:opacity-90 disabled:opacity-50";

const outlineBtn =
  "w-full rounded-full border-2 border-[#1a1208] px-6 py-3.5 text-base font-bold text-[#1a1208] transition hover:bg-[#1a1208] hover:text-[#fbf1e3]";

const linkBtn = "w-full text-center text-sm font-semibold text-[#b45309] transition hover:underline";

function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`${bricolage.variable} ${manrope.variable} ${spaceMono.variable} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbf1e3] px-6 py-12 font-[family-name:var(--font-manrope)]`}
    >
      {/* SOLEIL */}
      <div className="pointer-events-none absolute -right-24 -top-28 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd166,#f9a826_60%,#f4801f)] opacity-90" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center font-[family-name:var(--font-bricolage)] text-[78px] font-extrabold tracking-tight text-[#1a1208]">
          Loya
        </div>

        <div className="rounded-3xl border border-[#efe3cd] bg-white/90 p-8 shadow-[0_24px_60px_-30px_rgba(120,53,15,0.45)] backdrop-blur sm:p-9">
          <p className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold uppercase tracking-[0.12em] text-[#b45309]">
            {eyebrow}
          </p>
          <h1 className="font-[family-name:var(--font-bricolage)] text-[30px] font-extrabold leading-tight tracking-tight text-[#1a1208]">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-[#7a684f]">{subtitle}</p>}

          <div className="mt-6 flex flex-col gap-3">{children}</div>
        </div>
      </div>

      {/* RETOUR */}
      <Link href="/" className="absolute top-6 left-6 text-sm font-semibold text-[#7a684f] hover:underline transition z-10">
        ← Accueil
      </Link>

    </div>
  );
}

/* ---------- Page ---------- */

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("view") === "signup") {
      setView("signup");
    }
  }, []);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (!error) {
      router.push("/dashboard");
    } else {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("email ou mot de passe incorrect.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Veuillez confirmer votre email avant de vous connecter.");
      } else if (error.message.includes("Too many requests")) {
        toast.error("Trop de tentatives, réessayez dans quelques minutes.");
      } else {
        toast.error("Erreur de connexion : " + error.message);
      }
    }
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Cet email est déjà utilisé.");
      } else if (error.message.includes("Password should be at least")) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      } else {
        toast.error("Erreur lors de la création du compte : " + error.message);
      }
    } else {
      setView("confirm");
    }
  }

  async function sendResetEmail() {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      if (error.message.includes("User not found")) {
        toast.error("Aucun compte trouvé avec cet email.");
      } else {
        toast.error("Erreur : " + error.message);
      }
    } else {
      setView("confirm");
    }
  }

  // ➜ Vue : email de confirmation envoyé
  if (view === "confirm") {
    return (
      <AuthShell
        eyebrow="Presque terminé"
        title="Vérifiez vos emails"
        subtitle={
          <>
            Un email vous a été envoyé à <strong className="text-[#1a1208]">{email}</strong>. Cliquez sur le lien
            pour continuer.
          </>
        }
      >
        <div className="-mt-2 mb-1 text-5xl text-center">📧</div>
      </AuthShell>
    );
  }

  // ➜ Vue : mot de passe oublié
  if (view === "forgot") {
    return (
      <AuthShell
        eyebrow="Récupération"
        title="Mot de passe oublié"
        subtitle="Entrez votre email, nous vous enverrons un lien de réinitialisation."
      >
        <input
          className={inputClass}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={sendResetEmail} disabled={loading} className={primaryBtn}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
        

      </AuthShell>
    );
  }

  // ➜ Vue : inscription
  if (view === "signup") {
    return (
      <AuthShell eyebrow="Gestion locative · sans effort" title="Créer un compte">
        <input className={inputClass} placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input
          className={inputClass}
          type="password"
          placeholder="Mot de passe"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={signUp} disabled={loading} className={primaryBtn}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
        <button onClick={() => setView("login")} className={linkBtn}>
          ← Retour à la connexion
        </button>
      </AuthShell>
    );
  }

// ➜ Vue : connexion (par défaut)
  return (
    <div className={`${bricolage.variable} ${manrope.variable} ${spaceMono.variable} relative min-h-screen bg-[#fbf1e3] font-[family-name:var(--font-manrope)]`}>
      <AuthShell eyebrow="Content de vous revoir" title="Connexion">
        <input className={inputClass} placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        <input
          className={inputClass}
          type="password"
          placeholder="Mot de passe"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={signIn} disabled={loading} className={primaryBtn}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <button onClick={() => setView("forgot")} className={linkBtn}>
          Mot de passe oublié ?
        </button>

        <div className="my-1 flex items-center gap-3 text-[#cbb892]">
          <span className="h-px flex-1 bg-[#e6d6bb]" />
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-bold uppercase tracking-widest">
            ou
          </span>
          <span className="h-px flex-1 bg-[#e6d6bb]" />
        </div>

        <button onClick={() => setView("signup")} className={outlineBtn}>
          Créer un compte
        </button>
      </AuthShell>
    </div>
  );
}
