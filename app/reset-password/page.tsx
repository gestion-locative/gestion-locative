"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function updatePassword() {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setLoading(false);
      if (error.message.includes("Password should be at least")) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères.");
        } else if (error.message.includes("same password")) {
        toast.error("Le nouveau mot de passe doit être différent de l'ancien.");
        } else {
        toast.error("Erreur : " + error.message);
        }
      return;
    }

    await supabase.auth.signOut({ scope: "others" });

    setLoading(false);
    toast.success("Mot de passe mis à jour !");
    router.push("/tenants");
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-80 text-center">
          <p className="text-gray-500 text-sm">Vérification du lien en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow w-80">
        <h1 className="text-xl font-bold mb-2">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-500 mb-4">
          Choisissez un nouveau mot de passe pour votre compte.
        </p>

        <input
          className="border p-2 w-full mb-4 rounded"
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={updatePassword}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded disabled:opacity-50"
        >
          {loading ? "Mise à jour..." : "Mettre à jour"}
        </button>
      </div>
    </div>
  );
}