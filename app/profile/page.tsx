"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const ORANGE = "#e8590c";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const FIELD_BG = "#fdf8ef";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `2px solid ${FIELD_BORDER}`,
  background: FIELD_BG,
  borderRadius: 12,
  padding: "11px 14px",
  fontSize: 15,
  color: INK,
  fontFamily: body,
  outline: "none",
  boxSizing: "border-box",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: display,
  fontSize: 17,
  fontWeight: 700,
  color: INK,
  marginBottom: 4,
};

const eyebrow: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: BROWN,
};

const helpText: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: MUTE,
  marginBottom: 14,
  lineHeight: 1.5,
};

export default function ProfilePage() {
  const router = useRouter();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
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
    if (!userData.user) { router.push("/login"); return; }

    const { data, error } = await supabase
      .from("owner_profiles")
      .select("*")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      console.log("Erreur fetch profile:", error);
    } else if (data) {
      setLastName(data?.last_name ?? "");
      setFirstName(data?.first_name ?? "");
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
          last_name: lastName,
          first_name: firstName,
          full_name: `${firstName} ${lastName}`.trim(),
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
    const { data: publicUrlData } = supabase.storage.from("signatures").getPublicUrl(filePath);
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
    if (!error) { setSignatureUrl(null); toast.success("Signature supprimée."); }
    else toast.error("Impossible de supprimer la signature.");
  }

  const SaveRow = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={saveProfile}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 18px",
          borderRadius: 999,
          fontFamily: body,
          fontWeight: 700,
          fontSize: 15,
          cursor: hasChanges ? "pointer" : "default",
          border: "none",
          transition: "opacity .2s",
          opacity: loading ? 0.5 : 1,
          background: hasChanges ? INK : "#f0e6d4",
          color: hasChanges ? CREAM : MUTE,
          boxShadow: hasChanges ? "0 8px 20px -8px rgba(26,18,8,0.5)" : "none",
        }}
      >
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
      {hasChanges && (
        <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, whiteSpace: "nowrap" }}>
          ⚠️ Non enregistré
        </p>
      )}
    </div>
  );

  if (loadingPage) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM, fontFamily: body }}>
        <p style={{ fontFamily: mono, fontSize: 14, color: MUTE }}>Chargement...</p>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: "16px", fontFamily: body, position: "relative", overflow: "hidden" }}>
      {/* SOLEIL décoratif */}
      <div style={{
        pointerEvents: "none", position: "absolute", right: -110, top: -130,
        width: 360, height: 360, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)",
        opacity: 0.85,
      }} />

      <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>

        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", border: `2px solid ${FIELD_BORDER}`,
          padding: "9px 16px", borderRadius: 999,
          fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none",
        }}>
          ← Accueil
        </Link>

        <div style={{
          background: "#fff", borderRadius: 24, border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 60px -34px rgba(120,53,15,0.4)",
          padding: "24px 20px", marginTop: 16,
        }}>
          <p style={{ ...eyebrow, marginBottom: 10 }}>Mon compte</p>
          <h1 style={{ fontFamily: display, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 6 }}>
            Mon profil propriétaire
          </h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#7a684f", marginBottom: 24 }}>
            Ces informations apparaîtront sur vos quittances de loyer.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Nom"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setHasChanges(true); }}
            />
            <input
              style={inputStyle}
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setHasChanges(true); }}
            />

            {/* GENRE */}
            <div style={{ display: "flex", gap: 10, padding: "2px 0" }}>
              {[{ v: "homme", label: "Homme" }, { v: "femme", label: "Femme" }].map((opt) => {
                const active = gender === opt.v;
                return (
                  <label key={opt.v} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "10px 14px", borderRadius: 12,
                    border: `2px solid ${active ? INK : FIELD_BORDER}`,
                    background: active ? INK : FIELD_BG,
                    color: active ? CREAM : "#7a684f",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                  }}>
                    <input type="radio" name="gender" checked={active}
                      onChange={() => { setGender(opt.v); setHasChanges(true); }}
                      style={{ display: "none" }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>

            <input
              style={inputStyle}
              placeholder="Adresse"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setHasChanges(true); }}
            />

            {/* CODE POSTAL + VILLE — flex wrap sur mobile */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                style={{ ...inputStyle, flex: "1 1 100px", minWidth: "80px" }}
                placeholder="Code postal"
                value={postalCode}
                onChange={(e) => { setPostalCode(e.target.value); setHasChanges(true); }}
              />
              <input
                style={{ ...inputStyle, flex: "2 1 160px", minWidth: "120px" }}
                placeholder="Ville"
                value={city}
                onChange={(e) => { setCity(e.target.value); setHasChanges(true); }}
              />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <SaveRow />
          </div>

          {/* SIGNATURE */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${FIELD_BORDER}` }}>
            <h2 style={sectionTitle}>✍️ Signature</h2>
            <p style={helpText}>
              Si vous n'en ajoutez pas, votre nom apparaîtra en signature sur les quittances.
            </p>

            {signatureUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <img
                  src={signatureUrl}
                  alt="Signature"
                  style={{ height: 64, border: `1px solid ${FIELD_BORDER}`, borderRadius: 10, background: "#fff", padding: "0 8px" }}
                />
                <button onClick={removeSignature} style={{
                  background: "none", border: "none", fontSize: 13, fontWeight: 600,
                  color: "#b3361f", cursor: "pointer", textDecoration: "underline", fontFamily: body,
                }}>
                  Supprimer
                </button>
              </div>
            ) : (
              <div>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: INK, color: CREAM, fontSize: 14, fontWeight: 700,
                  padding: "11px 20px", borderRadius: 999, cursor: "pointer",
                }}>
                  📤 Ajouter ma signature
                  <input type="file" accept="image/png, image/jpeg"
                    onChange={handleSignatureUpload} disabled={uploadingSignature}
                    style={{ display: "none" }}
                  />
                </label>
                {uploadingSignature && (
                  <p style={{ fontSize: 12.5, color: MUTE, marginTop: 8 }}>Envoi en cours...</p>
                )}
              </div>
            )}
          </div>

          {/* EMAILS */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${FIELD_BORDER}` }}>
            <h2 style={sectionTitle}>✉️ Personnalisation des emails</h2>
            <p style={helpText}>
              Variables disponibles :{" "}
              {["{nom_locataire}", "{loyer}", "{mois}", "{nom_proprietaire}"].map((v) => (
                <code key={v} style={{ fontFamily: mono, fontSize: 11.5, background: CREAM, padding: "1px 6px", borderRadius: 5, color: BROWN, marginRight: 4 }}>{v}</code>
              ))}
            </p>

            <p style={{ fontSize: 13, fontWeight: 700, color: "#5c4a2e", marginBottom: 6 }}>🔁 Email de relance</p>
            <input
              style={{ ...inputStyle, marginBottom: 8, fontSize: 14 }}
              placeholder="Objet"
              value={reminderSubject}
              onChange={(e) => { setReminderSubject(e.target.value); setHasChanges(true); }}
            />
            <textarea
              style={{ ...inputStyle, marginBottom: 18, fontSize: 14, resize: "vertical", lineHeight: 1.5 }}
              placeholder="Message"
              rows={6}
              value={reminderBody}
              onChange={(e) => { setReminderBody(e.target.value); setHasChanges(true); }}
            />

            <p style={{ fontSize: 13, fontWeight: 700, color: "#5c4a2e", marginBottom: 6 }}>📄 Email de quittance</p>
            <input
              style={{ ...inputStyle, marginBottom: 8, fontSize: 14 }}
              placeholder="Objet"
              value={receiptSubject}
              onChange={(e) => { setReceiptSubject(e.target.value); setHasChanges(true); }}
            />
            <textarea
              style={{ ...inputStyle, fontSize: 14, resize: "vertical", lineHeight: 1.5 }}
              placeholder="Message"
              rows={6}
              value={receiptBody}
              onChange={(e) => { setReceiptBody(e.target.value); setHasChanges(true); }}
            />

            <div style={{ marginTop: 16 }}>
              <SaveRow />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

