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
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const RED = "#b3361f";
const RED_BG = "#fcece6";
const AMBER = "#b45309";
const AMBER_BG = "#fbeccf";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function RemindAllModal({ tenants, onConfirm, onCancel }: { tenants: any[]; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,18,8,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 420, width: "100%", boxShadow: "0 32px 80px -20px rgba(26,18,8,0.5)", border: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
        <div style={{ pointerEvents: "none", position: "absolute", right: -60, top: -60, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.6 }} />
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Envoi groupé</p>
          <h2 style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: INK, marginBottom: 10, letterSpacing: "-0.02em" }}>
            Relancer {tenants.length} locataire{tenants.length > 1 ? "s" : ""} ?
          </h2>
          <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 14, lineHeight: 1.6 }}>Un email de relance sera envoyé à :</p>
          <div style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 12, padding: "10px 14px", marginBottom: 24, maxHeight: 160, overflowY: "auto" }}>
            {tenants.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{t.name}</span>
                <span style={{ fontSize: 13, color: MUTE }}>{t.email}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={onConfirm} style={{ padding: "14px 20px", borderRadius: 999, background: INK, color: CREAM, fontFamily: body, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)" }}>
              📧 Envoyer les relances
            </button>
            <button onClick={onCancel} style={{ padding: "13px 20px", borderRadius: 999, background: "transparent", color: "#7a684f", fontFamily: body, fontWeight: 700, fontSize: 15, border: `2px solid ${FIELD_BORDER}`, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [loadingRentCallId, setLoadingRentCallId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"relances" | "quittances" | "appels" | "logs" | "validation">("relances");
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [filterTenant, setFilterTenant] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSent, setFilterSent] = useState<"" | "sent" | "unsent">("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [pendingMatches, setPendingMatches] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [reassignTenant, setReassignTenant] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push("/login"); });
    fetchAll();
  }, []);

  async function fetchAll() { 
  await fetchTenants()
  await fetchReceipts()
  await fetchSyncLogs()
  await fetchPendingMatches()
}

  async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("tenants").select("*").eq("user_id", userData.user?.id).order("created_at", { ascending: false });
    if (!error) { setTenants(data || []); await fetchPayments(data || []); }
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) return;
    const monthKey = getCurrentMonthKey();
    const ids = tenantList.map((t) => t.id);
    const { data, error } = await supabase.from("payments").select("*").in("tenant_id", ids).eq("month", monthKey);
    if (!error) {
      const map: Record<string, any> = {};
      (data || []).forEach((p) => { map[p.tenant_id] = p; });
      setPayments(map);
    }
  }

  async function fetchReceipts() {
    const { data: userData } = await supabase.auth.getUser();
    const { data: tenantData } = await supabase.from("tenants").select("id").eq("user_id", userData.user?.id);
    if (!tenantData || tenantData.length === 0) return;
    const ids = tenantData.map((t) => t.id);
    const { data, error } = await supabase.from("receipts").select("*, tenants(name, email, rent, user_id)").in("tenant_id", ids).order("month", { ascending: false });
    if (!error) setReceipts(data || []);
  }

  async function fetchSyncLogs() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('synced_at', { ascending: false })
    .limit(20)
  if (!error) setSyncLogs(data || [])
}

  // ── NOUVEAU : suggestions de matching IA en attente de validation ──
  async function fetchPendingMatches() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { data, error } = await supabase
      .from('pending_bank_matches')
      .select('*, tenants(name)')
      .eq('user_id', userData.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (!error) setPendingMatches(data || [])
  }

  async function resolvePendingMatch(match: any, action: "confirm" | "reject") {
    setResolvingId(match.id)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const chosenTenantId = reassignTenant[match.id] || match.tenant_id
      const res = await fetch("/api/pending-matches/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: match.id,
          userId: userData.user?.id,
          action,
          tenantId: action === "confirm" ? chosenTenantId : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error(data.error || "Impossible de traiter cette suggestion.");
        return;
      }
      toast.success(action === "confirm" ? "Paiement confirmé !" : "Suggestion rejetée.");
      await fetchPendingMatches();
      await fetchTenants();
      await fetchReceipts();
    } catch {
      toast.error("Erreur réseau, veuillez réessayer.");
    } finally {
      setResolvingId(null);
    }
  }

  async function sendReminder(tenant: any) {
    setLoadingEmailId(tenant.id);
    try {
      const res = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: tenant.email, name: tenant.name, rent: tenant.rent, ownerId: tenant.user_id }) });
      const data = await res.json();
      if (!res.ok || data.error) toast.error("L'email de relance n'a pas pu être envoyé.");
      else {
        await supabase.from("tenants").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", tenant.id);
        toast.success(`Relance envoyée à ${tenant.name} !`);
        await fetchTenants();
      }
    } catch { toast.error("Erreur réseau lors de l'envoi."); }
    finally { setLoadingEmailId(null); }
  }

  async function confirmSendAllReminders() {
    setShowRemindModal(false);
    for (const tenant of unpaidTenants) { await sendReminder(tenant); }
  }

  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);
    try {
      const res = await fetch("/api/send-receipt-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: receipt.tenants.email, name: receipt.tenants.name, pdfUrl: receipt.pdf_url, month: formatMonth(receipt.month), ownerId: receipt.tenants.user_id, receiptId: receipt.id }) });
      const data = await res.json();
      if (!res.ok || data.error) toast.error("La quittance n'a pas pu être envoyée.");
      else { toast.success("Quittance envoyée !"); await fetchReceipts(); }
    } catch { toast.error("Erreur réseau lors de l'envoi."); }
    finally { setLoadingReceiptId(null); }
  }

  async function deleteReceipt(receipt: any) {
    const filePath = receipt.pdf_url.split("/receipts/")[1];
    await supabase.storage.from("receipts").remove([filePath]);
    const { error } = await supabase.from("receipts").delete().eq("id", receipt.id);
    if (!error) { toast.success("Quittance supprimée."); await fetchReceipts(); }
    else toast.error("Impossible de supprimer la quittance.");
  }

  async function sendRentCall(tenant: any) {
    setLoadingRentCallId(tenant.id);
    try {
      const res = await fetch("/api/send-rent-call", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: tenant.email, name: tenant.name, rent: tenant.rent, rentDueDay: tenant.rent_due_day, ownerId: tenant.user_id }) });
      if (res.ok) {
        await supabase.from("tenants").update({ last_rent_call_sent_at: new Date().toISOString() }).eq("id", tenant.id);
        toast.success(`Appel de loyer envoyé à ${tenant.name} !`);
        await fetchTenants();
      } else {
        toast.error("Impossible d'envoyer l'appel de loyer.");
      }
    } catch { toast.error("Erreur réseau."); }
    finally { setLoadingRentCallId(null); }
  }

  

  function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  function getDaysLate(tenant: any) {
    if (!tenant.rent_due_day) return 0;
    const diff = new Date().getDate() - Number(tenant.rent_due_day);
    return diff > 0 ? diff : 0;
  }

  function resetFilters() { setFilterTenant(""); setFilterMonth(""); setFilterSent(""); setSortOrder("desc"); }

  const hasActiveFilter = filterTenant || filterMonth || filterSent || sortOrder !== "desc";
  const uniqueTenantNames = Array.from(new Set(receipts.map((r) => r.tenants?.name).filter(Boolean))).sort();
  const uniqueMonths = Array.from(new Set(receipts.map((r) => r.month))).sort((a, b) => b.localeCompare(a));

  const filteredReceipts = receipts
    .filter((r) => {
      if (filterTenant && r.tenants?.name !== filterTenant) return false;
      if (filterMonth && r.month !== filterMonth) return false;
      if (filterSent === "sent" && !r.sent_at) return false;
      if (filterSent === "unsent" && r.sent_at) return false;
      return true;
    })
    .sort((a, b) => sortOrder === "desc" ? b.month.localeCompare(a.month) : a.month.localeCompare(b.month));

  const unpaidTenants = tenants.filter((t) => !payments[t.id]?.is_paid);
  const unsentReceiptsCount = receipts.filter((r) => !r.sent_at).length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "12px 6px", marginBottom: -2, fontSize: 14, fontWeight: 700, fontFamily: body,
    background: "none", border: "none", cursor: "pointer",
    borderBottom: `3px solid ${active ? ORANGE : "transparent"}`,
    color: active ? INK : MUTE,
  });

  const selectStyle: React.CSSProperties = {
    border: `2px solid ${FIELD_BORDER}`, background: FIELD_BG, padding: "9px 12px", borderRadius: 12,
    fontSize: 13, color: INK, fontFamily: body, outline: "none", cursor: "pointer",
    boxSizing: "border-box", flex: "1 1 140px",
  };

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: "16px", fontFamily: body, position: "relative", overflow: "hidden" }}>
      <div style={{ pointerEvents: "none", position: "absolute", right: -120, top: -140, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.8 }} />

      {showRemindModal && (
        <RemindAllModal tenants={unpaidTenants} onConfirm={confirmSendAllReminders} onCancel={() => setShowRemindModal(false)} />
      )}

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${FIELD_BORDER}`, padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none", marginBottom: 20 }}>
          ← Accueil
        </Link>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Gestion locative</p>
        <h1 style={{ fontFamily: display, fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>📋 Vue globale</h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 12 }}>Toutes vos communications locatives en un endroit.</p>
        <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 24, lineHeight: 1.5 }}>
          🔒 Vos données restent privées : vos informations bancaires, celles de vos locataires, et tous les documents que vous stockez ne sont visibles que par vous. Rien n'est partagé avec d'autres propriétaires ni utilisé à d'autres fins.
        </p>

        {/* ONGLETS */}
        <div style={{ display: "flex", gap: 20, rowGap: 10, marginBottom: 24, borderBottom: `2px solid ${FIELD_BORDER}`, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("relances")} style={tabStyle(activeTab === "relances")}>
            🔔 Relances
            {unpaidTenants.length > 0 && <span style={{ background: RED_BG, color: RED, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{unpaidTenants.length}</span>}
          </button>
          <button onClick={() => setActiveTab("quittances")} style={tabStyle(activeTab === "quittances")}>
            📄 Quittances
            {unsentReceiptsCount > 0 && <span style={{ background: AMBER_BG, color: AMBER, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{unsentReceiptsCount}</span>}
          </button>
          <button onClick={() => setActiveTab("appels")} style={tabStyle(activeTab === "appels")}>
            📨 Appels de loyer
          </button>
          <button onClick={() => setActiveTab("validation")} style={tabStyle(activeTab === "validation")}>
            🔍 À valider
            {pendingMatches.length > 0 && <span style={{ background: AMBER_BG, color: AMBER, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{pendingMatches.length}</span>}
          </button>
          <button onClick={() => setActiveTab("logs")} style={tabStyle(activeTab === "logs")}>
            🏦 Synchronisations
            {syncLogs.length > 0 && <span style={{ background: CREAM, color: "#7a684f", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{syncLogs.length}</span>}
          </button>
        </div>

        {/* ───────── ONGLET RELANCES ───────── */}
        {activeTab === "relances" && (
          <div>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16, lineHeight: 1.5 }}>
              Retrouvez ici tous les locataires dont le loyer n'est pas encore marqué payé ce mois-ci, pour relancer un par un ou tous en même temps.
            </p>
            {unpaidTenants.length === 0 ? (
              <div style={{ background: GREEN_BG, border: `1px solid #c3e6c8`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: GREEN, fontWeight: 700, fontFamily: display, fontSize: 16 }}>🎉 Tous les loyers sont payés ce mois-ci !</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>
                    {unpaidTenants.length} locataire{unpaidTenants.length > 1 ? "s" : ""} en attente ce mois
                  </p>
                  <button onClick={() => setShowRemindModal(true)} style={{ background: INK, color: CREAM, fontSize: 14, fontWeight: 700, fontFamily: body, padding: "11px 20px", borderRadius: 999, border: "none", cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)" }}>
                    Relancer tous ({unpaidTenants.length})
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {unpaidTenants.map((t) => {
                    const daysLate = getDaysLate(t);
                    return (
                      <div key={t.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{t.name}</p>
                            <p style={{ fontSize: 13, color: "#7a684f", marginTop: 2 }}>{t.email}</p>
                            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ fontFamily: display, fontSize: 13, fontWeight: 800, color: INK }}>{t.rent} €</span>
                              {daysLate > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: RED_BG, color: RED, padding: "3px 10px", borderRadius: 999 }}>Retard {daysLate}j</span>}
                              {t.auto_reminder_enabled && t.reminder_days?.length > 0 ? (
                                <span style={{ fontSize: 12, fontWeight: 700, background: CREAM, color: BROWN, padding: "3px 10px", borderRadius: 999 }}>🌞 Auto : {t.reminder_days.map((d: number) => d === 0 ? "J" : `J+${d}`).join(", ")}</span>
                              ) : (
                                <span style={{ fontSize: 12, fontWeight: 700, background: "#f1ece2", color: MUTE, padding: "3px 10px", borderRadius: 999 }}>Pas de relance auto</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Link href={`/tenants/${t.id}`} style={{ fontSize: 13, fontWeight: 600, color: BROWN, textDecoration: "underline" }}>Voir</Link>
                            <button onClick={() => sendReminder(t)} disabled={loadingEmailId === t.id} style={{ background: INK, color: CREAM, fontSize: 14, fontWeight: 700, fontFamily: body, padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: loadingEmailId === t.id ? 0.5 : 1 }}>
                              {loadingEmailId === t.id ? "Envoi..." : "Relancer"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── ONGLET QUITTANCES ───────── */}
        {activeTab === "quittances" && (
          <div>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16, lineHeight: 1.5 }}>
              Historique de toutes vos quittances, générées automatiquement dès qu'un loyer est marqué payé. Filtrez par locataire, mois ou statut d'envoi.
            </p>
            {receipts.length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a684f", fontWeight: 600 }}>Aucune quittance générée pour le moment.</p>
                <p style={{ fontSize: 12.5, color: MUTE, marginTop: 6, lineHeight: 1.5 }}>Les quittances sont générées automatiquement quand un loyer est marqué payé.</p>
              </div>
            ) : (
              <>
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)} style={selectStyle}>
                    <option value="">👤 Tous les locataires</option>
                    {uniqueTenantNames.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={selectStyle}>
                    <option value="">📅 Tous les mois</option>
                    {uniqueMonths.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                  <select value={filterSent} onChange={(e) => setFilterSent(e.target.value as "" | "sent" | "unsent")} style={selectStyle}>
                    <option value="">📬 Tous les statuts</option>
                    <option value="sent">✅ Envoyées</option>
                    <option value="unsent">⏳ Non envoyées</option>
                  </select>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")} style={selectStyle}>
                    <option value="desc">⬇ Plus récent</option>
                    <option value="asc">⬆ Plus ancien</option>
                  </select>
                  {hasActiveFilter && (
                    <button onClick={resetFilters} style={{ background: "none", border: `2px solid ${FIELD_BORDER}`, borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: MUTE, cursor: "pointer", fontFamily: body, whiteSpace: "nowrap" }}>
                      ✕ Réinitialiser
                    </button>
                  )}
                </div>

                <p style={{ fontSize: 13, color: MUTE, marginBottom: 12, fontWeight: 600 }}>
                  {filteredReceipts.length} quittance{filteredReceipts.length > 1 ? "s" : ""}
                  {filterTenant ? ` · ${filterTenant}` : ""}
                  {filterMonth ? ` · ${formatMonth(filterMonth)}` : ""}
                  {filterSent === "sent" ? " · Envoyées" : filterSent === "unsent" ? " · Non envoyées" : ""}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredReceipts.map((r) => (
                    <div key={r.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{r.tenants?.name}</p>
                          <p style={{ fontSize: 13, color: "#7a684f", textTransform: "capitalize", marginTop: 2 }}>{formatMonth(r.month)}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontFamily: display, fontWeight: 800, fontSize: 15, color: INK, margin: 0 }}>{r.tenants?.rent} €</p>
                          <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: r.sent_at ? GREEN_BG : "#f1ece2", color: r.sent_at ? GREEN : MUTE }}>
                            {r.sent_at ? "✅ Envoyée" : "⏳ Non envoyée"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: BROWN, textDecoration: "underline" }}>Télécharger</a>
                        <button onClick={() => sendReceipt(r)} disabled={loadingReceiptId === r.id} style={{ background: INK, color: CREAM, fontSize: 13, fontWeight: 700, fontFamily: body, padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: loadingReceiptId === r.id ? 0.5 : 1 }}>
                          {loadingReceiptId === r.id ? "Envoi..." : r.sent_at ? "Renvoyer" : "Envoyer"}
                        </button>
                        <button onClick={() => deleteReceipt(r)} style={{ background: "none", border: "none", color: RED, textDecoration: "underline", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body, padding: 0 }}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── ONGLET APPELS DE LOYER ───────── */}
        {activeTab === "appels" && (
          <div>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16, lineHeight: 1.5 }}>
              L'appel de loyer est un rappel envoyé avant l'échéance, avec votre IBAN — voyez ici qui l'a reçu ce mois-ci et renvoyez-en un si besoin.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontSize: 14, color: "#7a684f", fontWeight: 600 }}>
                {tenants.length} locataire{tenants.length > 1 ? "s" : ""}
              </p>
            </div>

            {tenants.length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a684f", fontWeight: 600 }}>Aucun locataire pour le moment.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tenants.map((t) => {
                  const hasReceivedCall = !!t.last_rent_call_sent_at
                  return (
                    <div key={t.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{t.name}</p>
                          <p style={{ fontSize: 13, color: "#7a684f", marginTop: 2 }}>{t.email}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontFamily: display, fontSize: 13, fontWeight: 800, color: INK }}>{t.rent} €</span>
                            {hasReceivedCall ? (
                              <span style={{ fontSize: 12, fontWeight: 700, background: GREEN_BG, color: GREEN, padding: "3px 10px", borderRadius: 999 }}>
                                ✅ Envoyé le {formatDateTime(t.last_rent_call_sent_at)}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 700, background: "#f1ece2", color: MUTE, padding: "3px 10px", borderRadius: 999 }}>
                                Aucun appel envoyé
                              </span>
                            )}
                            {t.auto_rent_call_enabled && (
                              <span style={{ fontSize: 12, fontWeight: 700, background: AMBER_BG, color: AMBER, padding: "3px 10px", borderRadius: 999 }}>📨 Auto activé</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Link href={`/tenants/${t.id}`} style={{ fontSize: 13, fontWeight: 600, color: BROWN, textDecoration: "underline" }}>Voir</Link>
                          <button onClick={() => sendRentCall(t)} disabled={loadingRentCallId === t.id} style={{ background: BROWN, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: body, padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: loadingRentCallId === t.id ? 0.5 : 1 }}>
                            {loadingRentCallId === t.id ? "Envoi..." : hasReceivedCall ? "Renvoyer" : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────── ONGLET À VALIDER (matching IA) ───────── */}
        {activeTab === "validation" && (
          <div>
            {pendingMatches.length === 0 ? (
              <div style={{ background: GREEN_BG, border: `1px solid #c3e6c8`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: GREEN, fontWeight: 700, fontFamily: display, fontSize: 16 }}>✅ Aucun virement en attente de validation</p>
                <p style={{ fontSize: 12.5, color: "#5c8a63", marginTop: 6, lineHeight: 1.5 }}>Quand un virement reçu ne peut pas être identifié avec certitude, il apparaîtra ici pour que vous le confirmiez vous-même.</p>
              </div>
            ) : (
              <>
                <div style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 16, padding: "14px 16px", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: "#7a684f", lineHeight: 1.6, margin: 0 }}>
                    Ces virements ont bien été reçus sur votre compte bancaire, mais Loya n'est pas certain de savoir à quel locataire ils correspondent. Vérifiez ci-dessous et confirmez ou corrigez — une fois confirmé, le loyer est marqué payé et la quittance est générée (envoyée automatiquement par email si vous avez activé cette option pour ce locataire, sinon vous pourrez l'envoyer depuis l'onglet Quittances). <strong>Une fois confirmé, Loya retient ce type de virement pour ce locataire — les mois suivants, il sera reconnu automatiquement sans repasser par cette validation.</strong>
                  </p>
                </div>
                <p style={{ fontSize: 14, color: "#7a684f", fontWeight: 600, marginBottom: 16 }}>
                  {pendingMatches.length} virement{pendingMatches.length > 1 ? "s" : ""} à confirmer
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingMatches.map((m) => (
                    <div key={m.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ fontSize: 12, color: MUTE, fontFamily: mono, margin: 0 }}>{m.raw_description}</p>
                          <p style={{ fontSize: 13, color: "#7a684f", marginTop: 4 }}>
                            {new Date(m.transaction_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <p style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: INK, margin: 0 }}>{m.amount} €</p>
                      </div>

                      <div style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}`, borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: BROWN, fontWeight: 700, margin: 0 }}>
                          Loya pense qu'il s'agit de : {m.tenants?.name || "locataire non identifié"}
                        </p>
                        {m.ai_reason && <p style={{ fontSize: 12, color: "#7a684f", marginTop: 4 }}>{m.ai_reason}</p>}
                      </div>

                      <p style={{ fontSize: 12, color: MUTE, marginBottom: 8 }}>Ce n'est pas le bon locataire ? Corrigez ici avant de confirmer :</p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={reassignTenant[m.id] || m.tenant_id || ""}
                          onChange={(e) => setReassignTenant((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          style={{ ...selectStyle, flex: "1 1 180px" }}
                        >
                          {tenants.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => resolvePendingMatch(m, "confirm")}
                          disabled={resolvingId === m.id}
                          style={{ background: GREEN, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: body, padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer", opacity: resolvingId === m.id ? 0.5 : 1 }}
                        >
                          {resolvingId === m.id ? "..." : "✓ Oui, c'est lui"}
                        </button>
                        <button
                          onClick={() => resolvePendingMatch(m, "reject")}
                          disabled={resolvingId === m.id}
                          style={{ background: "none", border: "none", color: RED, textDecoration: "underline", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body, padding: 0, opacity: resolvingId === m.id ? 0.5 : 1 }}
                        >
                          Aucun de mes locataires
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── ONGLET SYNCHRONISATIONS ───────── */}
        {activeTab === "logs" && (
        <div>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16, lineHeight: 1.5 }}>
              Historique technique de chaque analyse de vos virements bancaires — utile pour vérifier que la synchro tourne bien, indépendamment des paiements qu'elle détecte.
            </p>
            {syncLogs.length === 0 ? (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a684f", fontWeight: 600 }}>Aucune synchronisation bancaire pour le moment.</p>
                <p style={{ fontSize: 12.5, color: MUTE, marginTop: 6 }}>Connectez votre banque depuis l'accueil pour activer la synchro automatique.</p>
            </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {syncLogs.map((log) => (
                <div key={log.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <p style={{ fontFamily: display, fontWeight: 700, fontSize: 15, color: INK, margin: 0 }}>
                        {new Date(log.synced_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, background: CREAM, color: BROWN, padding: "3px 10px", borderRadius: 999 }}>
                            {log.transactions_checked} transactions analysées
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, background: log.matches_found > 0 ? GREEN_BG : "#f1ece2", color: log.matches_found > 0 ? GREEN : MUTE, padding: "3px 10px", borderRadius: 999 }}>
                            {log.matches_found} correspondance{log.matches_found > 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, background: log.payments_confirmed > 0 ? GREEN_BG : "#f1ece2", color: log.payments_confirmed > 0 ? GREEN : MUTE, padding: "3px 10px", borderRadius: 999 }}>
                            {log.payments_confirmed} paiement{log.payments_confirmed > 1 ? "s" : ""} confirmé{log.payments_confirmed > 1 ? "s" : ""}
                        </span>
                        </div>
                    </div>
                    {log.payments_confirmed > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: GREEN_BG, color: GREEN }}>
                        ✅ Automatique
                        </span>
                    )}
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        )}

      </div>
    </main>
  );
}
