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
  fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4,
};

const REMINDER_OPTIONS = [
  { value: 0, label: "Le jour de l'échéance" },
  { value: 3, label: "3 jours après" },
  { value: 7, label: "7 jours après" },
  { value: 10, label: "10 jours après" },
  { value: 15, label: "15 jours après" },
  { value: 30, label: "30 jours après" },
];

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
  { value: "Acte de cautionnement", label: "✍️ Acte de cautionnement" },
  { value: "Pièce d'identité (garant)", label: "🪪 Pièce d'identité (garant)" },
  { value: "Justificatif de revenus (garant)", label: "💰 Justificatif de revenus (garant)" },
  { value: "Autre", label: "📝 Autre" },
];

function Toggle({ enabled, onToggle, loading }: { enabled: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <button onClick={onToggle} disabled={loading} style={{ width: 48, height: 26, borderRadius: 999, border: "none", cursor: loading ? "not-allowed" : "pointer", background: enabled ? ORANGE : "#d1c4b0", position: "relative", transition: "background .2s", flexShrink: 0, opacity: loading ? 0.6 : 1 }}>
      <span style={{ position: "absolute", top: 3, left: enabled ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function ReceiptConfirmModal({ tenantName, onConfirm, onCancel }: { tenantName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,18,8,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 400, width: "100%", boxShadow: "0 32px 80px -20px rgba(26,18,8,0.5)", border: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
        <div style={{ pointerEvents: "none", position: "absolute", right: -60, top: -60, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.6 }} />
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Loyer marqué payé ✓</p>
          <h2 style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: INK, marginBottom: 10, letterSpacing: "-0.02em" }}>Envoyer la quittance ?</h2>
          <p style={{ fontSize: 14, color: "#7a684f", lineHeight: 1.6, marginBottom: 28 }}>
            La quittance de <strong style={{ color: INK }}>{tenantName}</strong> a été générée. Voulez-vous l'envoyer par email maintenant ?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onConfirm} style={{ padding: "14px 20px", borderRadius: 999, background: INK, color: CREAM, fontFamily: body, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)" }}>
              📧 Envoyer la quittance
            </button>
            <button onClick={onCancel} style={{ padding: "13px 20px", borderRadius: 999, background: "transparent", color: "#7a684f", fontFamily: body, fontWeight: 700, fontSize: 15, border: `2px solid ${FIELD_BORDER}`, cursor: "pointer" }}>
              Non merci, je l'enverrai plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TenantPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingReceiptManual, setLoadingReceiptManual] = useState(false);
  const [loadingRentCall, setLoadingRentCall] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Bail");
  const [togglingReminder, setTogglingReminder] = useState(false);
  const [togglingReceipt, setTogglingReceipt] = useState(false);
  const [updatingReminderDays, setUpdatingReminderDays] = useState(false);
  const [togglingRentCall, setTogglingRentCall] = useState(false);
  const [activeTab, setActiveTab] = useState<"infos" | "auto" | "historique" | "documents">("infos");
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingReceiptData, setPendingReceiptData] = useState<{ pdfUrl: string; receiptId: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { fetchAll(); }, [params.id]);

  // On initialise le brouillon de note une seule fois par locataire, pour ne pas
  // écraser ce que l'utilisateur est en train de taper à chaque re-fetch du tenant.
  useEffect(() => {
    if (tenant) setNoteDraft(tenant.notes || "");
  }, [tenant?.id]);

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
  }

  async function fetchDocuments() {
    const { data, error } = await supabase.from("documents").select("*").eq("tenant_id", params.id).order("created_at", { ascending: false });
    if (!error) setDocuments(data || []);
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
    const { error: insertError } = await supabase.from("documents").insert({ tenant_id: params.id, user_id: userId, type: selectedDocType, name: file.name, file_url: publicUrlData.publicUrl });
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

  async function fetchCurrentPayment() {
    const monthKey = getCurrentMonthKey();
    const { data, error } = await supabase.from("payments").select("*").eq("tenant_id", params.id).eq("month", monthKey).maybeSingle();
    if (error) return;
    if (data) { setCurrentPayment(data); }
    else {
      const { data: created, error: createError } = await supabase.from("payments").insert({ tenant_id: params.id, month: monthKey, is_paid: false }).select().single();
      if (!createError) { setCurrentPayment(created); await fetchHistory(); }
    }
  }

  async function fetchHistory() {
    const { data, error } = await supabase.from("payments").select("*").eq("tenant_id", params.id).order("month", { ascending: false });
    if (!error) setHistory(data || []);
  }

  async function fetchReceipts() {
    const { data, error } = await supabase.from("receipts").select("*").eq("tenant_id", params.id).order("month", { ascending: false });
    if (!error) setReceipts(data || []);
  }

  async function toggleAutoReminder() {
    setTogglingReminder(true);
    const newValue = !tenant.auto_reminder_enabled;
    const { error } = await supabase.from("tenants").update({ auto_reminder_enabled: newValue }).eq("id", tenant.id);
    if (!error) { setTenant((prev: any) => ({ ...prev, auto_reminder_enabled: newValue })); toast.success(newValue ? "Relance automatique activée !" : "Relance automatique désactivée."); }
    else toast.error("Impossible de modifier ce réglage.");
    setTogglingReminder(false);
  }

  async function toggleAutoRentCall() {
    setTogglingRentCall(true);
    const newValue = !tenant.auto_rent_call_enabled;
    const { error } = await supabase.from("tenants").update({ auto_rent_call_enabled: newValue }).eq("id", tenant.id);
    if (!error) { setTenant((prev: any) => ({ ...prev, auto_rent_call_enabled: newValue })); toast.success(newValue ? "Appel de loyer automatique activé !" : "Appel de loyer automatique désactivé."); }
    else toast.error("Impossible de modifier ce réglage.");
    setTogglingRentCall(false);
  }

  async function toggleAutoReceipt() {
    setTogglingReceipt(true);
    const newValue = !tenant.auto_receipt_enabled;
    const { error } = await supabase.from("tenants").update({ auto_receipt_enabled: newValue }).eq("id", tenant.id);
    if (!error) { setTenant((prev: any) => ({ ...prev, auto_receipt_enabled: newValue })); toast.success(newValue ? "Envoi automatique activé !" : "Envoi automatique désactivé."); }
    else toast.error("Impossible de modifier ce réglage.");
    setTogglingReceipt(false);
  }

  async function toggleReminderDay(day: number) {
    setUpdatingReminderDays(true);
    const current = tenant.reminder_days || [];
    const newDays = current.includes(day) ? current.filter((d: number) => d !== day) : [...current, day].sort((a: number, b: number) => a - b);
    const { error } = await supabase.from("tenants").update({ reminder_days: newDays }).eq("id", tenant.id);
    if (!error) setTenant((prev: any) => ({ ...prev, reminder_days: newDays }));
    else toast.error("Impossible de modifier les jours de relance.");
    setUpdatingReminderDays(false);
  }

  // ── NOUVEAU : enregistrer la note libre du locataire ──
  async function saveNote() {
    setSavingNote(true);
    const { error } = await supabase.from("tenants").update({ notes: noteDraft }).eq("id", tenant.id);
    if (!error) {
      setTenant((prev: any) => ({ ...prev, notes: noteDraft }));
      toast.success("Note enregistrée.");
    } else {
      toast.error("Impossible d'enregistrer la note.");
    }
    setSavingNote(false);
  }

  async function generateReceipt(paymentId: string) {
    try {
      const res = await fetch("/api/generate-receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: params.id, paymentId }) });
      const data = await res.json();
      if (!res.ok || data.error) return null;
      await fetchReceipts();
      return data.url;
    } catch { return null; }
  }

  async function sendReceiptEmail(pdfUrl: string, receiptId: string) {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    await fetch("/api/send-receipt-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: tenant.email, name: tenant.name, pdfUrl, month: monthLabel, ownerId: tenant.user_id, receiptId }) });
    await fetchReceipts();
  }

  async function handleReceiptAfterPayment(paymentId: string) {
    const pdfUrl = await generateReceipt(paymentId);
    if (!pdfUrl) return;
    if (tenant.auto_receipt_enabled) {
      const { data: newReceipt } = await supabase.from("receipts").select("*").eq("tenant_id", params.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setPendingReceiptData({ pdfUrl, receiptId: newReceipt?.id });
      setModalVisible(true);
    } else {
      toast.success("Loyer marqué payé — quittance générée !");
    }
  }

  async function handleModalConfirm() {
    setModalVisible(false);
    if (!pendingReceiptData) return;
    await sendReceiptEmail(pendingReceiptData.pdfUrl, pendingReceiptData.receiptId);
    toast.success("Quittance envoyée avec succès !");
    setPendingReceiptData(null);
  }

  function handleModalCancel() {
    setModalVisible(false);
    setPendingReceiptData(null);
    toast.success("Quittance générée. Vous pouvez l'envoyer plus tard.");
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
    if (newStatus) await handleReceiptAfterPayment(data.id);
    else toast.success("Loyer marqué comme impayé.");
    setLoadingPayment(false);
  }

  async function toggleHistoryPayment(payment: any) {
    setLoadingHistoryId(payment.id);
    const newStatus = !payment.is_paid;
    const { data, error } = await supabase.from("payments").update({ is_paid: newStatus, paid_at: newStatus ? new Date().toISOString() : null }).eq("id", payment.id).select().single();
    if (error) { setLoadingHistoryId(null); toast.error("Impossible de modifier ce mois, veuillez réessayer."); return; }
    if (payment.month === getCurrentMonthKey()) setCurrentPayment(data);
    await fetchHistory();
    if (newStatus) await handleReceiptAfterPayment(data.id);
    setLoadingHistoryId(null);
  }

  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);
    try {
      const res = await fetch("/api/send-receipt-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: tenant.email, name: tenant.name, pdfUrl: receipt.pdf_url, month: formatMonth(receipt.month), ownerId: tenant.user_id, receiptId: receipt.id }) });
      const data = await res.json();
      if (!res.ok || data.error) toast.error("La quittance n'a pas pu être envoyée, veuillez réessayer.");
      else { toast.success("Quittance envoyée avec succès !"); await fetchReceipts(); }
    } catch { toast.error("Erreur réseau, vérifiez votre connexion internet."); }
    finally { setLoadingReceiptId(null); }
  }

  async function sendReminder() {
    setLoadingEmail(true);
    try {
      const res = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: tenant.email, name: tenant.name, rent: tenant.rent, ownerId: tenant.user_id }) });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error("L'email de relance n'a pas pu être envoyé, vérifiez votre connexion."); return; }
      const { data: updated, error: updateError } = await supabase.from("tenants").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", tenant.id).select().single();
      if (!updateError) setTenant(updated);
      toast.success("Relance envoyée avec succès !");
    } catch { toast.error("Erreur réseau, vérifiez votre connexion internet."); }
    finally { setLoadingEmail(false); }
  }

  // ── NOUVEAU : envoyer la quittance du mois manuellement ──
  async function sendReceiptManually() {
    if (!currentPayment?.is_paid) return;
    setLoadingReceiptManual(true);
    try {
      // Chercher la quittance du mois en cours
      const currentReceipt = receipts.find(r => r.month === getCurrentMonthKey());
      if (!currentReceipt) {
        // Générer d'abord si elle n'existe pas
        const pdfUrl = await generateReceipt(currentPayment.id);
        if (!pdfUrl) { toast.error("Impossible de générer la quittance."); return; }
        const { data: newReceipt } = await supabase.from("receipts").select("*").eq("payment_id", currentPayment.id).maybeSingle();
        if (newReceipt) await sendReceipt(newReceipt);
      } else {
        await sendReceipt(currentReceipt);
      }
    } catch { toast.error("Erreur lors de l'envoi de la quittance."); }
    finally { setLoadingReceiptManual(false); }
  }

  // ── NOUVEAU : envoyer un appel de loyer manuellement ──
  async function sendRentCallManually() {
    setLoadingRentCall(true);
    try {
      const { data: owner } = await supabase.from("owner_profiles").select("*").eq("user_id", tenant.user_id).maybeSingle();
      const now = new Date();
      const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const ibanLigne = owner?.iban ? `Voici les coordonnées de virement : ${owner.iban}` : "";
      const subjectTemplate = owner?.rent_call_subject || "Appel de loyer — {mois}";
      const bodyTemplate = owner?.rent_call_body || `Bonjour {nom_locataire},\n\nPetit rappel : le loyer de {loyer}€ pour {mois} est à régler avant le {jour_echeance} du mois.\n\n{iban_ligne}\n\nMerci d'avance,\n\nBien cordialement,\n{nom_proprietaire}`;
      const subject = subjectTemplate.replace("{mois}", monthLabel);
      const message = bodyTemplate
        .replace("{nom_locataire}", tenant.name)
        .replace("{loyer}", String(tenant.rent))
        .replace("{mois}", monthLabel)
        .replace("{jour_echeance}", String(tenant.rent_due_day || "5"))
        .replace("{iban_ligne}", ibanLigne)
        .replace("{nom_proprietaire}", owner?.full_name || "Votre propriétaire");

      const res = await fetch("/api/send-rent-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: tenant.email,
        name: tenant.name,
        rent: tenant.rent,
        rentDueDay: tenant.rent_due_day,
        ownerId: tenant.user_id,
      }),
    })

    if (res.ok) {
      await supabase.from("tenants").update({ last_rent_call_sent_at: new Date().toISOString() }).eq("id", tenant.id);
      const { data: updated } = await supabase.from("tenants").select("*").eq("id", tenant.id).single();
      if (updated) setTenant(updated);
      toast.success("Appel de loyer envoyé !");
    } else {
      toast.error("Impossible d'envoyer l'appel de loyer.");
    }

    } catch { toast.error("Erreur réseau."); }
    finally { setLoadingRentCall(false); }
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
  const hasReceiptThisMonth = receipts.some(r => r.month === getCurrentMonthKey());
  const activeAutoCount = [tenant.auto_reminder_enabled, tenant.auto_rent_call_enabled, tenant.auto_receipt_enabled].filter(Boolean).length;
  const unsentReceiptsCount = receipts.filter((r) => !r.sent_at).length;

  const TABS = [
    { key: "infos", label: "💰 Infos & paiement", badge: null },
    { key: "auto", label: "⚙️ Automatisation", badge: activeAutoCount > 0 ? `${activeAutoCount}/3` : null },
    { key: "historique", label: "📜 Historique", badge: unsentReceiptsCount > 0 ? unsentReceiptsCount : null },
    { key: "documents", label: "📁 Documents", badge: documents.length > 0 ? documents.length : null },
  ] as const;

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: "16px", fontFamily: body, position: "relative", overflow: "hidden" }}>
      <div style={{ pointerEvents: "none", position: "absolute", right: -120, top: -140, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.8 }} />

      {modalVisible && tenant && (
        <ReceiptConfirmModal tenantName={tenant.name} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
      )}

      <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>

        <button onClick={() => router.back()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${FIELD_BORDER}`, padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: INK, cursor: "pointer", fontFamily: body, marginBottom: 16 }}>
          ← Retour
        </button>

        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: "0 24px 60px -34px rgba(120,53,15,0.4)", padding: "24px 20px" }}>

          {/* EN-TÊTE */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: display, fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em", color: INK, margin: 0 }}>{tenant.name}</h1>
              <span style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", background: isPaidThisMonth ? GREEN_BG : RED_BG, color: isPaidThisMonth ? GREEN : RED }}>
                {isPaidThisMonth ? "🟢 Payé ce mois" : "🔴 En attente"}
              </span>
            </div>
          </div>

          {/* STATUT ÉCHÉANCE */}
          {dueStatus && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: dueStatus.type === "late" ? RED_BG : AMBER_BG, color: dueStatus.type === "late" ? RED : AMBER, border: `1px solid ${dueStatus.type === "late" ? "#f1c9bd" : "#f0d9a8"}` }}>
              {dueStatus.label}
            </div>
          )}

          {/* BARRE D'ONGLETS */}
          <div style={{ display: "flex", gap: 20, rowGap: 10, marginBottom: 28, borderBottom: `2px solid ${FIELD_BORDER}`, flexWrap: "wrap" }}>
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 2px", marginBottom: -2, fontSize: 14, fontWeight: 700, fontFamily: body, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", borderBottom: `3px solid ${activeTab === tab.key ? ORANGE : "transparent"}`, color: activeTab === tab.key ? INK : MUTE }}>
                {tab.label}
                {tab.badge !== null && (
                  <span style={{ background: activeTab === tab.key ? RED_BG : CREAM, color: activeTab === tab.key ? RED : "#7a684f", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ───────── ONGLET : INFOS & PAIEMENT ───────── */}
          {activeTab === "infos" && (
            <div>
              {/* BLOC CONTACT */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 14, color: "#7a684f", margin: 0 }}>{tenant.email}</p>
                {tenant.phone && <p style={{ fontSize: 14, color: "#7a684f", marginTop: 8 }}>📞 <a href={`tel:${tenant.phone}`} style={{ color: BROWN, textDecoration: "none" }}>{tenant.phone}</a></p>}
                {tenant.property_address && <p style={{ fontSize: 14, color: MUTE, marginTop: 8 }}>📍 {tenant.property_address}</p>}
              </div>

              {/* BLOC LOYER */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Loyer mensuel</span>
                  <span style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: INK }}>{tenant.rent} €</span>
                </div>
                {tenant.rent_due_day && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Échéance</span>
                    <span style={{ fontSize: 14, color: INK, fontWeight: 600 }}>Le {tenant.rent_due_day} du mois</span>
                  </div>
                )}
                {tenant.last_reminder_sent_at && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap", gap: 4 }}>
                    <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Dernière relance</span>
                    <span style={{ fontSize: 14, color: INK, fontWeight: 600 }}>{formatDateTime(tenant.last_reminder_sent_at)}</span>
                  </div>
                )}
              </div>

              

              {/* ACTIONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Marquer payé */}
                <button onClick={togglePaid} disabled={loadingPayment} style={{ padding: "14px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: loadingPayment ? 0.5 : 1, border: isPaidThisMonth ? `2px solid ${FIELD_BORDER}` : "none", background: isPaidThisMonth ? "transparent" : GREEN, color: isPaidThisMonth ? "#7a684f" : "#fff" }}>
                  {loadingPayment ? "Mise à jour..." : isPaidThisMonth ? "Marquer comme impayé" : "✓ Marquer comme payé ce mois"}
                </button>

                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Relance */}
                  <button
                    onClick={sendReminder}
                    disabled={loadingEmail || isPaidThisMonth}
                    title={isPaidThisMonth ? "Le loyer est déjà payé" : ""}
                    style={{ padding: "13px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 14, border: "none", cursor: isPaidThisMonth ? "not-allowed" : "pointer", opacity: loadingEmail || isPaidThisMonth ? 0.4 : 1, background: isPaidThisMonth ? "#f0e6d4" : INK, color: isPaidThisMonth ? MUTE : CREAM }}
                  >
                    {loadingEmail ? "Envoi en cours..." : "🔔 Envoyer une relance"}
                  </button>

                  {/* Quittance manuelle */}
                  <button
                    onClick={sendReceiptManually}
                    disabled={loadingReceiptManual || !isPaidThisMonth}
                    title={!isPaidThisMonth ? "Marquez d'abord le loyer comme payé" : ""}
                    style={{ padding: "13px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 14, border: "none", cursor: !isPaidThisMonth ? "not-allowed" : "pointer", opacity: loadingReceiptManual || !isPaidThisMonth ? 0.4 : 1, background: !isPaidThisMonth ? "#f0e6d4" : GREEN, color: !isPaidThisMonth ? MUTE : "#fff" }}
                  >
                    {loadingReceiptManual ? "Envoi en cours..." : !isPaidThisMonth ? "📄 Quittance — loyer non payé" : hasReceiptThisMonth ? "📄 Renvoyer la quittance" : "📄 Envoyer la quittance"}
                  </button>

                  {/* Appel de loyer manuel */}
                  <button
                    onClick={sendRentCallManually}
                    disabled={loadingRentCall}
                    style={{ padding: "13px 18px", borderRadius: 999, fontFamily: body, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", opacity: loadingRentCall ? 0.4 : 1, background: BROWN, color: "#fff" }}
                  >
                    {loadingRentCall ? "Envoi en cours..." : "📨 Envoyer un appel de loyer"}
                  </button>
                </div>
              </div>

              {/* BLOC NOTE */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px",marginTop: 24, marginBottom: 16, border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 14, color: "#7a684f", fontWeight: 600, marginBottom: 10 }}>📝 Note</p>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Ajoutez une information utile sur ce locataire (garant, remarque, historique...)"
                  rows={3}
                  style={{
                    width: "100%",
                    border: `2px solid ${FIELD_BORDER}`,
                    background: FIELD_BG,
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 14,
                    color: INK,
                    fontFamily: body,
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
                {noteDraft !== (tenant.notes || "") && (
                  <button
                    onClick={saveNote}
                    disabled={savingNote}
                    style={{
                      marginTop: 10,
                      background: INK,
                      color: CREAM,
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 18px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: body,
                      opacity: savingNote ? 0.6 : 1,
                    }}
                  >
                    {savingNote ? "Enregistrement..." : "Enregistrer la note"}
                  </button>
                )}
              </div>

            </div>
          )}

          {/* ───────── ONGLET : AUTOMATISATION ───────── */}
          {activeTab === "auto" && (
            <div>
              <div style={{ background: FIELD_BG, borderRadius: 16, padding: 18, marginBottom: 12, border: `1px solid ${FIELD_BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: INK, margin: 0 }}>🌞 Relance automatique</p>
                    <p style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>Envoie une relance email si le loyer n'est pas payé</p>
                  </div>
                  <Toggle enabled={tenant.auto_reminder_enabled} onToggle={toggleAutoReminder} loading={togglingReminder} />
                </div>
                {tenant.auto_reminder_enabled && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${FIELD_BORDER}` }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 10 }}>Envoyer une relance :</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {REMINDER_OPTIONS.map((opt) => {
                        const checked = (tenant.reminder_days || []).includes(opt.value);
                        return (
                          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#5c4a2e", cursor: "pointer" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleReminderDay(opt.value)} disabled={updatingReminderDays} style={{ width: 17, height: 17, accentColor: ORANGE }} />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ background: FIELD_BG, borderRadius: 16, padding: 18, marginBottom: 12, border: `1px solid ${FIELD_BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: INK, margin: 0 }}>📨 Appel de loyer automatique</p>
                    <p style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>Envoie un rappel avec votre IBAN le 1er de chaque mois</p>
                  </div>
                  <Toggle enabled={tenant.auto_rent_call_enabled} onToggle={toggleAutoRentCall} loading={togglingRentCall} />
                </div>
              </div>
              <div style={{ background: FIELD_BG, borderRadius: 16, padding: 18, border: `1px solid ${FIELD_BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: INK, margin: 0 }}>📄 Envoi automatique des quittances</p>
                    <p style={{ fontSize: 12, color: MUTE, marginTop: 3 }}>Propose d'envoyer la quittance dès qu'un loyer est marqué payé</p>
                  </div>
                  <Toggle enabled={tenant.auto_receipt_enabled} onToggle={toggleAutoReceipt} loading={togglingReceipt} />
                </div>
              </div>
            </div>
          )}

          {/* ───────── ONGLET : HISTORIQUE ───────── */}
          {activeTab === "historique" && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>💰 Paiements</h2>
                <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Cliquez sur un mois pour corriger son statut</p>
                {history.length === 0 ? (
                  <p style={{ fontSize: 14, color: MUTE }}>Aucun historique pour le moment.</p>
                ) : (
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
                    {history.map((p, idx) => (
                      <button key={p.id} onClick={() => toggleHistoryPayment(p)} disabled={loadingHistoryId === p.id} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, fontSize: 14, padding: "12px 16px", background: "transparent", border: "none", borderBottom: idx < history.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer", fontFamily: body, opacity: loadingHistoryId === p.id ? 0.5 : 1 }}>
                        <span style={{ color: "#5c4a2e", textTransform: "capitalize", fontWeight: 600 }}>{formatMonth(p.month)}</span>
                        <span style={{ fontWeight: 700, color: p.is_paid ? GREEN : RED }}>
                          {loadingHistoryId === p.id ? "Mise à jour..." : p.is_paid ? `🟢 Payé le ${formatDateTime(p.paid_at).split(" à")[0]}` : "🔴 Non payé"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 28 }}>
                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>📄 Quittances</h2>
                <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Générée automatiquement dès qu'un loyer est marqué payé.</p>
                {receipts.length === 0 ? (
                  <p style={{ fontSize: 14, color: MUTE, lineHeight: 1.5 }}>Aucune quittance pour le moment.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {receipts.map((r) => (
                      <div key={r.id} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                          <p style={{ color: "#5c4a2e", textTransform: "capitalize", fontWeight: 600, fontSize: 14, margin: 0 }}>{formatMonth(r.month)}</p>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: r.sent_at ? GREEN_BG : "#f1ece2", color: r.sent_at ? GREEN : MUTE }}>
                            {r.sent_at ? "✅ Envoyée" : "⏳ Non envoyée"}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: BROWN, textDecoration: "underline", fontSize: 13, fontWeight: 600 }}>Télécharger</a>
                          <button onClick={() => sendReceipt(r)} disabled={loadingReceiptId === r.id} style={{ background: INK, color: CREAM, fontSize: 13, fontWeight: 700, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontFamily: body, opacity: loadingReceiptId === r.id ? 0.5 : 1 }}>
                            {loadingReceiptId === r.id ? "Envoi..." : r.sent_at ? "Renvoyer" : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>🔔 Relances</h2>
                <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Dernière relance envoyée à ce locataire.</p>
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
                  {tenant.last_reminder_sent_at ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Dernier envoi</span>
                      <span style={{ fontSize: 14, color: INK, fontWeight: 700 }}>{formatDateTime(tenant.last_reminder_sent_at)}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: MUTE, margin: 0 }}>Aucune relance envoyée pour le moment.</p>
                  )}
                </div>
              </div>

              <div>
                <h2 style={sectionTitle}>📨 Appels de loyer</h2>
                <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 12 }}>Dernier appel de loyer envoyé à ce locataire.</p>
                <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: "14px 16px" }}>
                  {tenant.last_rent_call_sent_at ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>Dernier envoi</span>
                      <span style={{ fontSize: 14, color: INK, fontWeight: 700 }}>{formatDateTime(tenant.last_rent_call_sent_at)}</span>
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: MUTE, margin: 0 }}>Aucun appel de loyer envoyé pour le moment.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ───────── ONGLET : DOCUMENTS ───────── */}
          {activeTab === "documents" && (
            <div>
              <h2 style={{ ...sectionTitle, marginBottom: 12 }}>📁 Documents</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} style={{ border: `2px solid ${FIELD_BORDER}`, background: FIELD_BG, padding: "11px 14px", borderRadius: 12, fontSize: 14, color: INK, fontFamily: body, outline: "none", boxSizing: "border-box", width: "100%" }}>
                  {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: INK, color: CREAM, fontSize: 14, fontWeight: 700, padding: "11px 20px", borderRadius: 999, cursor: "pointer", width: "fit-content" }}>
                  {uploadingDoc ? "Envoi en cours..." : "📤 Ajouter un document"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDocumentUpload} disabled={uploadingDoc} style={{ display: "none" }} />
                </label>
              </div>
              {documents.length === 0 ? (
                <p style={{ fontSize: 14, color: MUTE }}>Aucun document pour le moment.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {documents.map((doc) => (
                    <div key={doc.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 16px" }}>
                      <p style={{ fontWeight: 700, color: INK, margin: "0 0 2px" }}>{DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type}</p>
                      <p style={{ fontSize: 12, color: MUTE, margin: "0 0 8px" }}>{doc.name}</p>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: BROWN, textDecoration: "underline", fontSize: 13, fontWeight: 600 }}>Voir</a>
                        <button onClick={() => deleteDocument(doc)} style={{ background: "none", border: "none", color: RED, textDecoration: "underline", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body, padding: 0 }}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
