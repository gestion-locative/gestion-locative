"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------
   Relances & Quittances Loya — thème solaire, styles 100% en ligne.
   Toute la logique (onglets, relances, quittances) est identique.
------------------------------------------------------------------- */

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const ORANGE = "#e8590c";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const RED = "#b3361f";
const RED_BG = "#fcece6";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"relances" | "quittances">("relances");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
    fetchAll();
  }, []);

  async function fetchAll() {
    await fetchTenants();
    await fetchReceipts();
  }

  async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("user_id", userData.user?.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setTenants(data || []);
      await fetchPayments(data || []);
    }
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) return;

    const monthKey = getCurrentMonthKey();
    const ids = tenantList.map((t) => t.id);

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .in("tenant_id", ids)
      .eq("month", monthKey);

    if (!error) {
      const map: Record<string, any> = {};
      (data || []).forEach((p) => { map[p.tenant_id] = p; });
      setPayments(map);
    }
  }

  async function fetchReceipts() {
    const { data: userData } = await supabase.auth.getUser();

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("id")
      .eq("user_id", userData.user?.id);

    if (!tenantData || tenantData.length === 0) return;

    const ids = tenantData.map((t) => t.id);

    const { data, error } = await supabase
      .from("receipts")
      .select("*, tenants(name, email, rent, user_id)")
      .in("tenant_id", ids)
      .order("month", { ascending: false });

    if (!error) setReceipts(data || []);
  }

  async function sendReminder(tenant: any) {
    setLoadingEmailId(tenant.id);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tenant.email,
          name: tenant.name,
          rent: tenant.rent,
          ownerId: tenant.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("L'email de relance n'a pas pu être envoyé.");
      } else {
        await supabase
          .from("tenants")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", tenant.id);

        toast.success(`Relance envoyée à ${tenant.name} !`);
        await fetchTenants();
      }
    } catch {
      toast.error("Erreur réseau lors de l'envoi.");
    } finally {
      setLoadingEmailId(null);
    }
  }

  async function sendAllReminders() {
    const unpaidTenants = tenants.filter((t) => !payments[t.id]?.is_paid);
    if (unpaidTenants.length === 0) {
      toast.success("Tous les loyers sont payés !");
      return;
    }

    for (const tenant of unpaidTenants) {
      await sendReminder(tenant);
    }
  }

  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);

    try {
      const res = await fetch("/api/send-receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: receipt.tenants.email,
          name: receipt.tenants.name,
          pdfUrl: receipt.pdf_url,
          month: formatMonth(receipt.month),
          ownerId: receipt.tenants.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("La quittance n'a pas pu être envoyée.");
      } else {
        toast.success("Quittance envoyée !");
      }
    } catch {
      toast.error("Erreur réseau lors de l'envoi.");
    } finally {
      setLoadingReceiptId(null);
    }
  }

  function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  function getDaysLate(tenant: any) {
    if (!tenant.rent_due_day) return 0;
    const today = new Date().getDate();
    const diff = today - Number(tenant.rent_due_day);
    return diff > 0 ? diff : 0;
  }

  async function deleteReceipt(receipt: any) {
    const filePath = receipt.pdf_url.split("/receipts/")[1];
    await supabase.storage.from("receipts").remove([filePath]);

    const { error } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receipt.id);

    if (!error) {
      toast.success("Quittance supprimée.");
      await fetchReceipts();
    } else {
      toast.error("Impossible de supprimer la quittance.");
    }
  }

  const unpaidTenants = tenants.filter((t) => !payments[t.id]?.is_paid);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "12px 6px", marginBottom: -1, fontSize: 14, fontWeight: 700, fontFamily: body,
    background: "none", border: "none", cursor: "pointer",
    borderBottom: `3px solid ${active ? ORANGE : "transparent"}`,
    color: active ? INK : MUTE,
  });

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: 24, fontFamily: body, position: "relative", overflow: "hidden" }}>
      {/* SOLEIL décoratif */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          right: -120,
          top: -140,
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)",
          opacity: 0.8,
        }}
      />

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", border: `2px solid ${FIELD_BORDER}`,
            padding: "9px 16px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none",
            marginBottom: 20,
          }}
        >
          ← Accueil
        </Link>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>
          Gestion locative
        </p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>
          📋 Relances &amp; Quittances
        </h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 24 }}>Gérez vos relances et quittances en un seul endroit.</p>

        {/* ONGLETS */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24, borderBottom: `1px solid ${FIELD_BORDER}` }}>
          <button onClick={() => setActiveTab("relances")} style={tabStyle(activeTab === "relances")}>
            🔔 Relances
            {unpaidTenants.length > 0 && (
              <span style={{ background: RED_BG, color: RED, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                {unpaidTenants.length}
              </span>
            )}
          </button>

          <button onClick={() => setActiveTab("quittances")} style={tabStyle(activeTab === "quittances")}>
            📄 Quittances
            {receipts.length > 0 && (
              <span style={{ background: CREAM, color: "#7a684f", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                {receipts.length}
              </span>
            )}
          </button>
        </div>

        {/* SECTION RELANCES */}
        {activeTab === "relances" && (
          <div>
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
                  <button
                    onClick={sendAllReminders}
                    style={{
                      background: INK, color: CREAM, fontSize: 14, fontWeight: 700, fontFamily: body,
                      padding: "11px 20px", borderRadius: 999, border: "none", cursor: "pointer",
                      boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)",
                    }}
                  >
                    Relancer tous ({unpaidTenants.length})
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {unpaidTenants.map((t) => {
                    const daysLate = getDaysLate(t);
                    return (
                      <div
                        key={t.id}
                        style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                      >
                        <div>
                          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK }}>{t.name}</p>
                          <p style={{ fontSize: 13, color: "#7a684f", marginTop: 2 }}>{t.email}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontFamily: display, fontSize: 13, fontWeight: 800, color: INK }}>{t.rent} €</span>
                            {daysLate > 0 && (
                              <span style={{ fontSize: 12, fontWeight: 700, background: RED_BG, color: RED, padding: "3px 10px", borderRadius: 999 }}>
                                Retard {daysLate}j
                              </span>
                            )}
                            {t.auto_reminder_enabled && t.reminder_days?.length > 0 ? (
                              <span style={{ fontSize: 12, fontWeight: 700, background: CREAM, color: BROWN, padding: "3px 10px", borderRadius: 999 }}>
                                🌞 Auto : {t.reminder_days.map((d: number) => d === 0 ? "J" : `J+${d}`).join(", ")}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 700, background: "#f1ece2", color: MUTE, padding: "3px 10px", borderRadius: 999 }}>
                                Pas de relance auto
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <Link href={`/tenants/${t.id}`} style={{ fontSize: 13, fontWeight: 600, color: BROWN, textDecoration: "underline" }}>
                            Voir
                          </Link>
                          <button
                            onClick={() => sendReminder(t)}
                            disabled={loadingEmailId === t.id}
                            style={{
                              background: INK, color: CREAM, fontSize: 14, fontWeight: 700, fontFamily: body,
                              padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                              opacity: loadingEmailId === t.id ? 0.5 : 1,
                            }}
                          >
                            {loadingEmailId === t.id ? "Envoi..." : "Relancer"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION QUITTANCES */}
        {activeTab === "quittances" && (
          <div>
            {receipts.length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a684f", fontWeight: 600 }}>Aucune quittance générée pour le moment.</p>
                <p style={{ fontSize: 12.5, color: MUTE, marginTop: 6, lineHeight: 1.5 }}>Les quittances sont générées automatiquement quand un loyer est marqué payé.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {receipts.map((r) => (
                  <div
                    key={r.id}
                    style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                  >
                    <div>
                      <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK }}>{r.tenants?.name}</p>
                      <p style={{ fontSize: 13, color: "#7a684f", textTransform: "capitalize", marginTop: 2 }}>{formatMonth(r.month)}</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: BROWN, textDecoration: "underline" }}
                      >
                        Télécharger
                      </a>
                      <button
                        onClick={() => sendReceipt(r)}
                        disabled={loadingReceiptId === r.id}
                        style={{
                          background: INK, color: CREAM, fontSize: 14, fontWeight: 700, fontFamily: body,
                          padding: "9px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                          opacity: loadingReceiptId === r.id ? 0.5 : 1,
                        }}
                      >
                        {loadingReceiptId === r.id ? "Envoi..." : "Envoyer"}
                      </button>
                      <button
                        onClick={() => deleteReceipt(r)}
                        style={{ background: "none", border: "none", color: RED, textDecoration: "underline", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body }}
                      >
                        Supprimer
                      </button>
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
