"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type View = "login" | "signup" | "forgot" | "confirm";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (!error) {
      router.push("/tenants");
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-80 text-center">
          <p className="text-4xl mb-4">📧</p>
          <h1 className="text-xl font-bold mb-2">Vérifiez vos emails</h1>
          <p className="text-sm text-gray-500 mb-6">
            Un email vous a été envoyé à <strong>{email}</strong>. Cliquez sur le lien pour continuer.
          </p>
          <button
            onClick={() => setView("login")}
            className="text-sm text-blue-600 hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ➜ Vue : mot de passe oublié
  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-80">
          <h1 className="text-xl font-bold mb-2">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500 mb-4">
            Entrez votre email, nous vous enverrons un lien de réinitialisation.
          </p>

          <input
            className="border p-2 w-full mb-4 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={sendResetEmail}
            disabled={loading}
            className="bg-blue-600 text-white w-full py-2 rounded mb-3 disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>

          <button
            onClick={() => setView("login")}
            className="text-sm text-gray-500 hover:underline w-full text-center"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ➜ Vue : inscription
  if (view === "signup") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-80">
          <h1 className="text-xl font-bold mb-4">Créer un compte</h1>

          <input
            className="border p-2 w-full mb-2 rounded"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="border p-2 w-full mb-4 rounded"
            type="password"
            placeholder="Mot de passe"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={signUp}
            disabled={loading}
            className="bg-blue-600 text-white w-full py-2 rounded mb-3 disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>

          <button
            onClick={() => setView("login")}
            className="text-sm text-gray-500 hover:underline w-full text-center"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // ➜ Vue : connexion (par défaut)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-80">
        <h1 className="text-xl font-bold mb-4">Connexion</h1>

        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-4 rounded"
          type="password"
          placeholder="Mot de passe"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded mb-2 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <button
          onClick={() => setView("forgot")}
          className="text-sm text-gray-500 hover:underline w-full text-center mb-2"
        >
          Mot de passe oublié ?
        </button>

        <button
          onClick={() => setView("signup")}
          className="bg-gray-100 text-gray-700 w-full py-2 rounded"
        >
          Créer un compte
        </button>
      </div>
    </div>
  );
}