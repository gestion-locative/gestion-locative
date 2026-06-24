"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("homme");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [reminderSubject, setReminderSubject] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [receiptSubject, setReceiptSubject] = useState("");
  const [receiptBody, setReceiptBody] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("owner_profiles")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      console.log("Erreur fetch profile:", error);
    } else if (data) {
      setFullName(data.full_name);
      setAddress(data.address);
      setPostalCode(data.postal_code);
      setCity(data.city);
      setGender(data.gender ?? "homme");
      setSignatureUrl(data.signature_url ?? null);
      setReminderSubject(data.reminder_subject ?? "Rappel de paiement de loyer");
      setReminderBody(data.reminder_body ?? `Bonjour {nom_locataire},\n\nNous vous informons que le paiement de votre loyer de {loyer}€ est actuellement en attente. Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\n{nom_proprietaire}`);
      setReceiptSubject(data.receipt_subject ?? "Quittance de loyer — {mois}");
      setReceiptBody(data.receipt_body ?? `Bonjour {nom_locataire},\n\nNous vous remercions pour le règlement de votre loyer. Vous trouverez ci-joint votre quittance de loyer pour la période concernée.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{nom_proprietaire}`);
    }

    setLoadingPage(false);
  }

  async function saveProfile() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("owner_profiles")
      .upsert(
        {
          user_id: userData.user?.id,
          full_name: fullName,
          address,
          postal_code: postalCode,
          city,
          gender,
          reminder_subject: reminderSubject,
          reminder_body: reminderBody,
          receipt_subject: receiptSubject,
          receipt_body: receiptBody,
        },
        { onConflict: "user_id" }
      );

    setLoading(false);

    if (error) {
      console.error("Erreur sauvegarde profil:", error);
      toast.error("Impossible d'enregistrer le profil, veuillez réessayer.");
    } else {
      toast.success("Profil enregistré !");
      setHasChanges(false);
    }
  }

  async function handleSignatureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSignature(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const filePath = `${userId}/signature.png`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Impossible d'uploader la signature, vérifiez le format du fichier (PNG ou JPG).");
      setUploadingSignature(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(filePath);

    const url = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("owner_profiles")
      .update({ signature_url: url })
      .eq("user_id", userId);

    setUploadingSignature(false);

    if (updateError) {
      toast.error("Erreur sauvegarde signature, veuillez réessayer.");
    } else {
      setSignatureUrl(url);
      toast.success("Signature enregistrée !");
    }
  }

  async function removeSignature() {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("owner_profiles")
      .update({ signature_url: null })
      .eq("user_id", userData.user?.id);

    if (!error) {
      setSignatureUrl(null);
      toast.success("Signature supprimée.");
    } else {
      toast.error("Impossible de supprimer la signature.");
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
        >
          ← Accueil
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            👤 Mon profil propriétaire
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Ces informations apparaîtront sur vos quittances de loyer.
          </p>

          <div className="flex flex-col gap-3">
            <input
              className="border p-2 w-full rounded"
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setHasChanges(true); }}
            />

            <div className="flex gap-4 text-sm text-gray-700 px-1">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "homme"}
                  onChange={() => { setGender("homme"); setHasChanges(true); }}
                />
                Homme
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "femme"}
                  onChange={() => { setGender("femme"); setHasChanges(true); }}
                />
                Femme
              </label>
            </div>

            <input
              className="border p-2 w-full rounded"
              placeholder="Adresse"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setHasChanges(true); }}
            />

            <div className="flex gap-3">
              <input
                className="border p-2 w-1/3 rounded"
                placeholder="Code postal"
                value={postalCode}
                onChange={(e) => { setPostalCode(e.target.value); setHasChanges(true); }}
              />
              <input
                className="border p-2 w-2/3 rounded"
                placeholder="Ville"
                value={city}
                onChange={(e) => { setCity(e.target.value); setHasChanges(true); }}
              />
            </div>
          </div>

          {/* BOUTON ENREGISTRER */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={loading}
              className={`px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 w-full ${
                hasChanges
                  ? "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300"
                  : "bg-gray-100 text-gray-500 cursor-default"
              }`}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>

            {hasChanges && (
              <p className="text-xs text-amber-600 whitespace-nowrap">
                ⚠️ Non enregistré
              </p>
            )}
          </div>

          {/* SIGNATURE */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              ✍️ Signature
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Si vous n'en ajoutez pas, votre nom apparaîtra en signature sur les quittances.
            </p>

            {signatureUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="h-16 border border-gray-200 rounded bg-white px-2"
                />
                <button
                  onClick={removeSignature}
                  className="text-xs text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition">
                  📤 Ajouter ma signature
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleSignatureUpload}
                    disabled={uploadingSignature}
                    className="hidden"
                  />
                </label>
                {uploadingSignature && (
                  <p className="text-xs text-gray-400 mt-2">Envoi en cours...</p>
                )}
              </div>
            )}
          </div>

          {/* PERSONNALISATION DES EMAILS */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              ✉️ Personnalisation des emails
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Variables disponibles : {"{nom_locataire}"}, {"{loyer}"}, {"{mois}"}, {"{nom_proprietaire}"}
            </p>

            <p className="text-xs font-medium text-gray-600 mb-1">🔁 Email de relance</p>
            <input
              className="border p-2 w-full mb-2 rounded text-sm"
              placeholder="Objet"
              value={reminderSubject}
              onChange={(e) => { setReminderSubject(e.target.value); setHasChanges(true); }}
            />
            <textarea
              className="border p-2 w-full mb-4 rounded text-sm"
              placeholder="Message"
              rows={6}
              value={reminderBody}
              onChange={(e) => { setReminderBody(e.target.value); setHasChanges(true); }}
            />

            <p className="text-xs font-medium text-gray-600 mb-1">📄 Email de quittance</p>
            <input
              className="border p-2 w-full mb-2 rounded text-sm"
              placeholder="Objet"
              value={receiptSubject}
              onChange={(e) => { setReceiptSubject(e.target.value); setHasChanges(true); }}
            />
            <textarea
              className="border p-2 w-full rounded text-sm"
              placeholder="Message"
              rows={6}
              value={receiptBody}
              onChange={(e) => { setReceiptBody(e.target.value); setHasChanges(true); }}
            />

            {/* BOUTON ENREGISTRER (répété en bas pour les emails, plus pratique) */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveProfile}
                disabled={loading}
                className={`px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 w-full ${
                  hasChanges
                    ? "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300"
                    : "bg-gray-100 text-gray-500 cursor-default"
                }`}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>

              {hasChanges && (
                <p className="text-xs text-amber-600 whitespace-nowrap">
                  ⚠️ Non enregistré
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}