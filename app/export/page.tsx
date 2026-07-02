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

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 18px 40px -30px rgba(120,53,15,0.4)",
  padding: 24,
  marginBottom: 16,
};

export default function ExportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [archivedTenants, setArchivedTenants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"export" | "archives">("export");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
    loadData();
    fetchArchivedTenants();
  }, []);

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: tenants } = await supabase
      .from("tenants")
      .select("id")
      .eq("user_id", userData.user.id);

    if (!tenants || tenants.length === 0) return;

    const ids = tenants.map((t) => t.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("month")
      .in("tenant_id", ids);

    if (!payments || payments.length === 0) return;

    const years = Array.from(
      new Set(payments.map((p) => new Date(p.month).getFullYear()))
    ).sort((a, b) => b - a);

    setAvailableYears(years);
    if (years.length > 0) setYear(years[0]);
  }

  async function exportCSV() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const response = await fetch(`/api/export?userId=${userData.user.id}&year=${year}`);
      if (!response.ok) { toast.error("Erreur lors de l'export."); return; }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loya_paiements_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${year} téléchargé !`);
    } catch {
      toast.error("Erreur lors de l'export.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedTenants() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, property_address, rent, created_at")
      .eq("user_id", userData.user.id)
      .eq("is_archived", true)
      .order("created_at", { ascending: false });

    if (!tenants || tenants.length === 0) { setArchivedTenants([]); return; }

    const ids = tenants.map(t => t.id);
    const { data: payments } = await supabase
      .from("payments")
      .select("tenant_id, is_paid")
      .in("tenant_id", ids)
      .eq("is_paid", true);

    const totals: Record<string, number> = {};
    tenants.forEach(t => { totals[t.id] = 0; });
    ;(payments || []).forEach(p => {
      const tenant = tenants.find(t => t.id === p.tenant_id);
      if (tenant) totals[p.tenant_id] += tenant.rent || 0;
    });

    setArchivedTenants(tenants.map(t => ({ ...t, totalCollected: totals[t.id] || 0 })));
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "12px 6px", marginBottom: -2, fontSize: 14, fontWeight: 700, fontFamily: body,
    background: "none", border: "none", cursor: "pointer",
    borderBottom: `3px solid ${active ? ORANGE : "transparent"}`,
    color: active ? INK : MUTE,
  });

  async function unarchiveTenant(id: string) {
  const { error } = await supabase.from("tenants").update({ is_archived: false }).eq("id", id)
  if (!error) { await fetchArchivedTenants(); toast.success("Locataire désarchivé !"); }
  else toast.error("Erreur lors du désarchivage.")
}

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: 24, fontFamily: body, position: "relative", overflow: "hidden" }}>
      <div style={{ pointerEvents: "none", position: "absolute", right: -120, top: -140, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.8 }} />

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${FIELD_BORDER}`, padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none", marginBottom: 20 }}>
          ← Accueil
        </Link>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Comptabilité</p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 4 }}>📊 Export & Fiscalité</h1>
        <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 24 }}>Téléchargez vos données pour votre comptabilité ou déclaration fiscale.</p>

        {/* ONGLETS */}
        <div style={{ display: "flex", gap: 24, marginBottom: 28, borderBottom: `2px solid ${FIELD_BORDER}` }}>
          <button onClick={() => setActiveTab("export")} style={tabStyle(activeTab === "export")}>
            📥 Export
          </button>
          <button onClick={() => setActiveTab("archives")} style={tabStyle(activeTab === "archives")}>
            📦 Locataires archivés
            {archivedTenants.length > 0 && (
              <span style={{ background: FIELD_BG, color: MUTE, fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, border: `1px solid ${FIELD_BORDER}` }}>
                {archivedTenants.length}
              </span>
            )}
          </button>
        </div>

        {/* ───────── ONGLET EXPORT ───────── */}
        {activeTab === "export" && (
          <div>
            {/* SÉLECTEUR D'ANNÉE */}
            {availableYears.length > 0 && (
              <div style={card}>
                <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 16 }}>Année fiscale</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {availableYears.map((y) => (
                    <button key={y} onClick={() => setYear(y)} style={{ padding: "10px 20px", borderRadius: 999, border: year === y ? "none" : `2px solid ${FIELD_BORDER}`, background: year === y ? INK : "transparent", color: year === y ? CREAM : INK, fontFamily: body, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EXPORT */}
            <div style={card}>
              <h2 style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4 }}>📥 Export Excel</h2>
              <p style={{ fontSize: 13, color: "#7a684f", marginBottom: 20, lineHeight: 1.6 }}>
                Téléchargez un fichier Excel avec tous vos paiements de {year}. Idéal pour votre expert-comptable ou votre déclaration de revenus fonciers.
              </p>
              <div style={{ background: FIELD_BG, borderRadius: 12, padding: "12px 16px", marginBottom: 20, border: `1px solid ${FIELD_BORDER}` }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: MUTE, marginBottom: 10 }}>Le fichier contiendra :</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                  {["Nom du locataire", "Adresse du bien", "Montant du loyer", "Mois concerné", "Statut (Payé / Non payé)", "Date de paiement", "Date d'envoi des quittances"].map((item) => (
                    <span key={item} style={{ fontSize: 13, color: "#5c4a2e" }}>✓ {item}</span>
                  ))}
                </div>
              </div>
              <button onClick={exportCSV} disabled={loading} style={{ width: "100%", padding: "14px 20px", borderRadius: 999, border: "none", background: loading ? "#f0e6d4" : INK, color: loading ? MUTE : CREAM, fontFamily: body, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 20px -8px rgba(26,18,8,0.5)" }}>
                {loading ? "Export en cours..." : `📥 Télécharger l'export ${year} (.xlsx)`}
              </button>
            </div>

            {/* INFO FISCALE */}
            <div style={{ background: "linear-gradient(160deg, #ffeccb, #ffdca8)", border: "1px solid #f3cd9a", borderRadius: 20, padding: 24 }}>
              <h2 style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: INK, marginBottom: 8 }}>💡 Déclaration fiscale</h2>
              <p style={{ fontSize: 13, color: "#5c4a2e", lineHeight: 1.6, margin: 0 }}>
                Les revenus locatifs sont à déclarer dans la catégorie <strong>revenus fonciers</strong> (formulaire 2044) si vous êtes au régime réel, ou en micro-foncier si vos revenus sont inférieurs à 15 000€/an. En cas de doute, consultez un expert-comptable ou le site impots.gouv.fr.
              </p>
            </div>
          </div>
        )}

        {/* ───────── ONGLET ARCHIVÉS ───────── */}
        {activeTab === "archives" && (
          <div>
            <p style={{ fontSize: 14, color: "#7a684f", marginBottom: 16 }}>
              Vos anciens locataires — leur historique est inclus dans l'export Excel.
            </p>

            {archivedTenants.length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <p style={{ color: "#7a684f", fontWeight: 600 }}>Aucun locataire archivé pour le moment.</p>
                <p style={{ fontSize: 12.5, color: MUTE, marginTop: 6 }}>Depuis la liste des locataires, cliquez sur "📦 Archiver" pour archiver un ancien locataire.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {archivedTenants.map((t) => (
                  <div key={t.id} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontFamily: display, fontWeight: 700, fontSize: 15, color: INK, margin: 0 }}>{t.name}</p>
                        {t.property_address && <p style={{ fontSize: 13, color: MUTE, marginTop: 2 }}>📍 {t.property_address}</p>}
                        <p style={{ fontSize: 13, color: "#7a684f", marginTop: 4 }}>
                          Loyer : <strong>{t.rent} €</strong> · Total encaissé : <strong>{t.totalCollected.toLocaleString("fr-FR")} €</strong>
                        </p>
                      </div>
                
                      <button
                        onClick={() => unarchiveTenant(t.id)}
                        style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "transparent", color: BROWN, border: `1px solid ${FIELD_BORDER}`, cursor: "pointer", fontFamily: body }}
                      >
                        Désarchiver
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
