"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const RED = "#b3361f";
const RED_BG = "#fcece6";
const AMBER = "#b45309";
const AMBER_BG = "#fbeccf";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const sectionTitle: React.CSSProperties = {
  fontFamily: display,
  fontSize: 17,
  fontWeight: 700,
  color: INK,
  marginBottom: 4,
};

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const DOCUMENT_TYPES = [
  { value: "Bail", label: "📄 Bail" },
  { value: "État des lieux (entrée)", label: "🏠 État des lieux (entrée)" },
  { value: "État des lieux (sortie)", label: "🏠 État des lieux (sortie)" },
  { value: "Certificat d'assurance", label: "🛡️ Certificat d'assurance" },
  { value: "Pièce d'identité", label: "🪪 Pièce d'identité" },
  { value: "Justificatif de revenus", label: "💰 Justificatif de revenus" },
  { value: "Autre", label: "📝 Autre" },
];

export default function TenantPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Bail");

  useEffect(() => { fetchAll(); }, [params.id]);

  async function fetchDocuments() {
    const { data, error } = await supabase
      .from("documents").select("*").eq("tenant_id", params.id)
      .order("created_at", { ascending: false });
    if (!error) setDocuments(data || []);
    else console.log("Erreur fetch documents:", error);
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const filePath = `${userId}/${params.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: false });
    if (uploadError) { toast.error("Impossible d'uploader le document."); setUploadingDoc(false); return; }
    const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(filePath);
    const { error: insertError } = await supabase.from("documents").insert({
      tenant_id: params.id, user_id: userId, type: selectedDocType,
      name: file.name, file_url: publicUrlData.publicUrl,
    });
    setUploadingDoc(false);
    if (insertError) toast.error("Erreur lors de l'enregistrement du document.");
    else { toast.success("Document ajouté !"); await fetchDocuments(); e.target.value = ""; }
  }

  async function deleteDocument(doc: any) {
    const filePath = doc.file_url.split("/documents/")[1];
    await supabase.storage.from("documents").remove([filePath]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (!error) { toast.success("Document supprimé."); await fetchDocuments(); }
    else toast.error("Impossible de supprimer le document.");
  }

  async function fetchAll() {
    await fetchTenant();
    await fetchCurrentPayment();
    await fetchHistory();
    await fetchReceipts();
    await fetchDocuments();
  }

  async function fetchTenant() {
    const { data, error } = await supabase.from("tenants").select("*").eq("id", params.id).single();
    if (!error) setTenant(data);
    else console.log("Erreur fetch tenant:", error);
  }

  async function fetchCurrentPayment() {
    const monthKey = getCurrentMonthKey();
    const { data, error } = await supabase.from("payments").select("*")
      .eq("tenant_id", params.id).eq("month", monthKey).maybeSingle();
    if (error) { console.log("Erreur fetch payment:", error); return; }
    if (data) {
      setCurrentPayment(data);
    } else {
      const { data: created, error: createError } = await supabase.from("payments")
        .insert({ tenant_id: params.id, month: monthKey, is_paid: false })
        .select().single();
      if (createError) console.log("Erreur création payment:", createError);
      else { setCurrentPayment(created); await fetchHistory(); }
    }
  }

  async function fetchHistory() {
    const { data, error } = await supabase.from("payments").select("*")
      .eq("tenant_id", params.id).order("month", { ascending: false });
    if (!error) setHistory(data || []);
    else console.log("Erreur fetch history:", error);
  }

  async function fetchReceipts() {
    const { data, error } = await supabase.from("receipts").select("*")
      .eq("tenant_id", params.id).order("month", { ascending: false });
    if (!error) setReceipts(data || []);
    else console.log("Erreur fetch receipts:", error);
  }

  async function generateReceipt(paymentId: string) {
    try {
      const res = await fetch("/api/generate-receipt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: params.id, paymentId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { console.error("Erreur génération quittance:", data.error); return null; }
      await fetchReceipts();
      return data.url;
    } catch (err) { console.error("Erreur génération quittance:", err); return null; }
  }

  async function togglePaid() {
    setLoadingPayment(true);
    const monthKey = getCurrentMonthKey();
    const newStatus = !(currentPayment?.is_paid);
    const { data, error } = await supabase.from("payments").upsert(
      { tenant_id: params.id, month: monthKey, is_paid: newStatus, paid_at: newStatus ? new Date().toISOString() : null },
      { onConflict: "tenant_id,month" }
    ).select().single();
    if (error) { setLoadingPayment(false); toast.error("Impossible de mettre à jour le statut, veuillez réessayer."); return; }
    setCurrentPayment(data);
    await fetchHistory();
    if (newStatus) await generateReceipt(data.id);
    setLoadingPayment(false);
  }

  async function toggleHistoryPayment(payment: any) {
    setLoadingHistoryId(payment.id);
    const newStatus = !payment.is_paid;
    const { data, error } = await supabase.from("payments")
      .update({ is_paid: newStatus, paid_at: newStatus ? new Date().toISOString() : null })
      .eq("id", payment.id).select().single();
    if (error) { setLoadingHistoryId(null); toast.error("Impossible de modifier ce mois, veuillez réessayer."); return; }
    if (payment.month === getCurrentMonthKey()) setCurrentPayment(data);
    await fetchHistory();
    if (newStatus) await generateReceipt(data.id);
    setLoadingHistoryId(null);
  }

  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);
    try {
      const res = await fetch("/api/send-receipt-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tenant.email, name: tenant.name, pdfUrl: receipt.pdf_url, month: formatMonth(receipt.month), ownerId: tenant.user_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) toast.error("La quittance n'a pas pu être envoyée, veuillez réessayer.");
      else toast.success("Quittance envoyée avec succès !");
    } catch (err) { toast.error("Erreur réseau, vérifiez votre connexion internet."); }
    finally { setLoadingReceiptId(null); }
  }

  async function sendReminder() {
    setLoadingEmail(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tenant.email, name: tenant.name, rent: tenant.rent, ownerId: tenant.user_id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error("L'email de relance n'a pas pu être envoyé, vérifiez votre connexion."); return; }
      const { data: updated, error: updateError } = await supabase.from("tenants")
        .update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", tenant.id).select().single();
      if (!updateError) setTenant(updated);
      toast.success("Relance envoyée avec succès !");
    } catch (err) { toast.error("Erreur réseau, vérifiez votre connexion internet."); }
    finally { setLoadingEmail(false); }
  }

  function getDueStatus() {
    if (!tenant.rent_due_day || currentPayment?.is_paid) return null;
    const today = new Date();
    const dueDay = Number(tenant.rent_due_day);
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    dueDate.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { type: "late", label: `🔴 En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? "s" : ""}` };
    if (diffDays === 0) return { type: "today", label: "⚠️ Échéance aujourd'hui" };
    if (diffDays <= 3) return { type: "soon", label: `⚠️ Échéance dans ${diffDays} jour${diffDays > 1 ? "s" : ""}` };
    return null;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  if (!tenant) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM, fontFamily: body }}>
        <p style={{ fontFamily: mono, fontSize: 14, color: MUTE }}>Chargement...</p>
      </div>
    );
  }

  const dueStatus = getDueStatus();
  const isPaidThisMonth = !!currentPayment?.is_paid;

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: "16px", fontFamily: body, position: "relative", overflow: "hidden" }}>
      {/* SOLEIL décoratif */}
      <div style={{
        pointerEvents: "none", position: "absolute", right: -120, top: -140,
        width: 340, height: 340, borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)",
        opacity: 0.8,
      }} />

      <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>

        <button onClick={() => router.back()} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#fff", border: `2px solid ${FIELD_BORDER}`,
          padding: "9px 16px", borderRadius: 999,
          fontSize: 14, fontWeight: 700, color: INK, cursor: "pointer",
          fontFamily: body, marginBottom: 16,
        }}>
          ← Retour
        </button>

        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: "0 24px 60px -34px rgba(120,53,15,0.4)", padding: "24px 20px" }}>

          {/* EN-TÊTE — badge passe en dessous sur mobile */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: display, fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em", color: INK, margin: 0 }}>{tenant.name}</h1>
              <span style={{
                flexShrink: 0,
                padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                background: isPaidThisMonth ? GREEN_BG : RED_BG,
                color: isPaidThisMonth ? GREEN : RED,
              }}>
                {isPaidThisMonth ? "🟢 Payé ce mois" : "🔴 En attente"}
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#7a684f", marginTop: 8 }}>{tenant.email}</p>
            {tenant.phone && (
              <p style={{ fontSize: 14, color: "#7a684f", marginTop: 4 }}>
                📞 <a href={`tel:${tenant.phone}`} style={{ color: BROWN, textDecoration: "none" }}>{tenant.phone}</a>
              </p>
            )}
            {tenant.property_address && (
              <p style={{ fontSize: 14, color: MUTE, marginTop: 4 }}>📍 {tenant.property_address}</p>
            )}
          </div>

          {/* STATUT ÉCHÉANCE */}
          {dueStatus && (
            <div style={{
              marginBottom: 24, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: dueStatus.type === "late" ? RED_BG : AMBER_BG,
              color: dueStatus.type === "late" ? RED : AMBER,
              border: `1px solid ${dueStatus.type === "late" ? "#f1c9bd" : "#f0d9a8"}`,
            }}>
              {dueStatus.label}
            </div>
          )}

          {/* RELANCE AUTO */}
          {tenant.auto_reminder_enabled && (
            <div style={{ marginBottom: 24, padding: "12px 16px", borderRadius: 12, background: CREAM, border: `1px solid ${FIELD_BORDER}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: BROWN }}>🌞 Relance automatique activée</span>
              {tenant.reminder_days?.length > 0 && (
                <p style={{ fontSize: 12.5, color: "#8a6f44", marginTop: 4 }}>
                  Envoi à : {tenant.reminder_days.map((d: number) => (d === 0 ? "J (échéance)" : `J+${d}`)).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* BLOC LOYER */}
          <div style={{ background: FIELD_BG, borderRadius: 14, padding: 20, marginBottom: 24, border: `1px solid ${FIELD_BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Loyer mensuel</span>
              <span style={{ fontFamily: display, fontSize: 24, fontWeight: 800, color: INK }}>{tenant.rent} €</span>
            </div>
            {tenant.rent_due_day && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Échéance</span>
                <span style={{ fontSize: 14, color: INK, fontWeight: 600 }}>Le {tenant.rent_due_day} du mois</span>
              </div>
            )}
            {tenant.last_reminder_sent_at && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Dernière relance</span>
                <span style={{ fontSize: 14, color: INK, fontWeight: 600 }}>{formatDateTime(tenant.last_reminder_sent_at)}</span>
              </div>
            )}
          </div>

          {/* ACTIONS PRINCIPALES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            <button onClick={togglePaid} disabled={loadingPayment} style={{
              padding: "14px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 15,
              cursor: "pointer", transition: "opacity .2s", opacity: loadingPayment ? 0.5 : 1,
              border: isPaidThisMonth ? `2px solid ${FIELD_BORDER}` : "none",
              background: isPaidThisMonth ? "transparent" : GREEN,
              color: isPaidThisMonth ? "#7a684f" : "#fff",
            }}>
              {loadingPayment ? "Mise à jour..." : isPaidThisMonth ? "Marquer comme impayé" : "✓ Marquer comme payé ce mois"}
            </button>

            <button onClick={sendReminder} disabled={loadingEmail || isPaidThisMonth} style={{
              padding: "14px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 15,
              border: "none",
              cursor: loadingEmail || isPaidThisMonth ? "not-allowed" : "pointer",
              opacity: loadingEmail || isPaidThisMonth ? 0.5 : 1,
              background: INK, color: CREAM,
              boxShadow: loadingEmail || isPaidThisMonth ? "none" : "0 8px 20px -8px rgba(26,18,8,0.5)",
            }}>
              {loadingEmail ? "Envoi en cours..." : isPaidThisMonth ? "Loyer déjà payé" : "Envoyer une relance"}
            </button>
          </div>

          {/* HISTORIQUE DES PAIEMENTS */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={sectionTitle}>Historique des paiements</h2>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Cliquez sur un mois pour corriger son statut</p>

            {history.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTE }}>Aucun historique pour le moment.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.map((p) => (
                  <button key={p.id} onClick={() => toggleHistoryPayment(p)} disabled={loadingHistoryId === p.id} style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: 4,
                    fontSize: 14, padding: "10px 8px", borderRadius: 8,
                    background: "transparent", border: "none",
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: "pointer", fontFamily: body,
                    opacity: loadingHistoryId === p.id ? 0.5 : 1,
                  }}>
                    <span style={{ color: "#5c4a2e", textTransform: "capitalize", fontWeight: 600 }}>{formatMonth(p.month)}</span>
                    <span style={{ fontWeight: 700, color: p.is_paid ? GREEN : RED }}>
                      {loadingHistoryId === p.id ? "Mise à jour..." : p.is_paid ? `🟢 Payé le ${formatDateTime(p.paid_at).split(" à")[0]}` : "🔴 Non payé"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QUITTANCES */}
          <div>
            <h2 style={{ ...sectionTitle, marginBottom: 12 }}>📄 Quittances de loyer</h2>

            {receipts.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTE, lineHeight: 1.5 }}>
                Aucune quittance pour le moment. Elle sera générée automatiquement dès qu'un mois est marqué payé.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {receipts.map((r) => (
                  <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
                    {/* Ligne 1 : mois */}
                    <p style={{ color: "#5c4a2e", textTransform: "capitalize", fontWeight: 600, fontSize: 14, margin: "0 0 8px" }}>{formatMonth(r.month)}</p>
                    {/* Ligne 2 : actions */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: BROWN, textDecoration: "underline", fontSize: 13, fontWeight: 600 }}>
                        Télécharger
                      </a>
                      <button onClick={() => sendReceipt(r)} disabled={loadingReceiptId === r.id} style={{
                        background: INK, color: CREAM, fontSize: 13, fontWeight: 700,
                        padding: "7px 14px", borderRadius: 999, border: "none",
                        cursor: "pointer", fontFamily: body,
                        opacity: loadingReceiptId === r.id ? 0.5 : 1,
                      }}>
                        {loadingReceiptId === r.id ? "Envoi..." : "Envoyer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DOCUMENTS */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${FIELD_BORDER}` }}>
            <h2 style={{ ...sectionTitle, marginBottom: 12 }}>📁 Documents</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} style={{
                border: `2px solid ${FIELD_BORDER}`, background: FIELD_BG, padding: "11px 14px",
                borderRadius: 12, fontSize: 14, color: INK, fontFamily: body, outline: "none",
                boxSizing: "border-box", width: "100%",
              }}>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <label style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: INK, color: CREAM, fontSize: 14, fontWeight: 700,
                padding: "11px 20px", borderRadius: 999, cursor: "pointer", width: "fit-content",
              }}>
                {uploadingDoc ? "Envoi en cours..." : "📤 Ajouter un document"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleDocumentUpload} disabled={uploadingDoc} style={{ display: "none" }} />
              </label>
            </div>

            {documents.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTE }}>Aucun document pour le moment.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {documents.map((doc) => (
                  <div key={doc.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
                    {/* Ligne 1 : type + nom */}
                    <p style={{ fontWeight: 700, color: INK, margin: "0 0 2px" }}>
                      {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                    </p>
                    <p style={{ fontSize: 12, color: MUTE, margin: "0 0 8px" }}>{doc.name}</p>
                    {/* Ligne 2 : actions */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: BROWN, textDecoration: "underline", fontSize: 13, fontWeight: 600 }}>
                        Voir
                      </a>
                      <button onClick={() => deleteDocument(doc)} style={{
                        background: "none", border: "none", color: RED,
                        textDecoration: "underline", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: body, padding: 0,
                      }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

