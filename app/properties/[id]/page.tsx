"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------
   Fiche détail d'un bien Loya — thème solaire, styles 100% en ligne.
   Toute la logique (locataires rattachés, paiements, rattacher/retirer,
   statut vacant) est strictement identique à l'original.
------------------------------------------------------------------- */

const INK = "#1a1208";
const CREAM = "#fbf1e3";
const BROWN = "#b45309";
const MUTE = "#a89372";
const BORDER = "#efe3cd";
const FIELD_BORDER = "#e6d6bb";
const FIELD_BG = "#fdf8ef";
const GREEN = "#1f7a37";
const GREEN_BG = "#e3f3e4";
const RED = "#b3361f";
const RED_BG = "#fcece6";

const display = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const mono = "var(--font-mono), 'Space Mono', ui-monospace, monospace";
const body = "var(--font-manrope), 'Manrope', system-ui, sans-serif";

const sectionTitle: React.CSSProperties = {
  fontFamily: display,
  fontSize: 17,
  fontWeight: 700,
  color: INK,
  marginBottom: 12,
};

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [params.id]);

  async function fetchAll() {
    await fetchProperty();
    await fetchTenants();
    await fetchAllTenants();
  }

  async function fetchProperty() {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!error) setProperty(data);
    else console.log("Erreur fetch property:", error);
  }

  async function fetchTenants() {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("property_id", params.id);

    if (!error) {
      setTenants(data || []);
      await fetchPayments(data || []);
    }
  }

  async function fetchAllTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("user_id", userData.user?.id)
      .is("property_id", null);

    if (!error) setAllTenants(data || []);
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) {
      setPayments({});
      return;
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
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

  async function linkTenant() {
    if (!selectedTenantId) return;
    setLoadingLink(true);

    const { error } = await supabase
      .from("tenants")
      .update({ property_id: params.id })
      .eq("id", selectedTenantId);

    setLoadingLink(false);

    if (!error) {
      toast.success("Locataire rattaché au bien !");
      setSelectedTenantId("");
      await fetchAll();
    } else {
      toast.error("Impossible de rattacher le locataire.");
    }
  }

  async function unlinkTenant(tenantId: string) {
    const { error } = await supabase
      .from("tenants")
      .update({ property_id: null })
      .eq("id", tenantId);

    if (!error) {
      toast.success("Locataire retiré du bien.");
      await fetchAll();
    } else {
      toast.error("Impossible de retirer le locataire.");
    }
  }

  async function updateVacancyStatus(tenantCount: number) {
    await supabase
      .from("properties")
      .update({ is_vacant: tenantCount === 0 })
      .eq("id", params.id);
  }

  useEffect(() => {
    if (property) {
      updateVacancyStatus(tenants.length);
    }
  }, [tenants]);

  if (!property) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: CREAM, fontFamily: body }}>
        <p style={{ fontFamily: mono, fontSize: 14, color: MUTE }}>Chargement...</p>
      </div>
    );
  }

  const totalRent = tenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;

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

      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>

        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", border: `2px solid ${FIELD_BORDER}`,
            padding: "9px 16px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, color: INK, cursor: "pointer",
            fontFamily: body, marginBottom: 16,
          }}
        >
          ← Retour
        </button>

        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${BORDER}`, boxShadow: "0 24px 60px -34px rgba(120,53,15,0.4)", padding: 32 }}>

          {/* INFOS DU BIEN */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: display, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: INK }}>{property.address}</h1>
              <p style={{ fontSize: 14, color: "#7a684f", marginTop: 4 }}>{property.postal_code} {property.city}</p>
              <p style={{ fontSize: 14, color: MUTE, marginTop: 4 }}>
                {property.type}{property.surface ? ` · ${property.surface} m²` : ""}
              </p>
              {property.description && (
                <p style={{ fontSize: 14, color: MUTE, marginTop: 4, fontStyle: "italic" }}>{property.description}</p>
              )}
            </div>

            <span
              style={{
                flexShrink: 0,
                padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                background: tenants.length === 0 ? RED_BG : GREEN_BG,
                color: tenants.length === 0 ? RED : GREEN,
              }}
            >
              {tenants.length === 0 ? "🔴 Vacant" : `🟢 ${tenants.length} locataire${tenants.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* STATS DU BIEN */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <div style={{ background: FIELD_BG, borderRadius: 14, padding: 14, textAlign: "center", border: `1px solid ${FIELD_BORDER}` }}>
              <p style={{ fontSize: 12, color: MUTE, fontWeight: 600, marginBottom: 4 }}>Loyer total</p>
              <p style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: INK, margin: 0 }}>{totalRent} €</p>
            </div>
            <div style={{ background: FIELD_BG, borderRadius: 14, padding: 14, textAlign: "center", border: `1px solid ${FIELD_BORDER}` }}>
              <p style={{ fontSize: 12, color: MUTE, fontWeight: 600, marginBottom: 4 }}>Payé ce mois</p>
              <p style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: GREEN, margin: 0 }}>{paidCount}</p>
            </div>
            <div style={{ background: FIELD_BG, borderRadius: 14, padding: 14, textAlign: "center", border: `1px solid ${FIELD_BORDER}` }}>
              <p style={{ fontSize: 12, color: MUTE, fontWeight: 600, marginBottom: 4 }}>En attente</p>
              <p style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: RED, margin: 0 }}>{tenants.length - paidCount}</p>
            </div>
          </div>

          {/* LOCATAIRES DU BIEN */}
          <h2 style={sectionTitle}>👥 Locataires</h2>

          {tenants.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTE, marginBottom: 16 }}>Aucun locataire rattaché à ce bien.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {tenants.map((t) => {
                const isPaid = !!payments[t.id]?.is_paid;
                return (
                  <div
                    key={t.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}
                  >
                    <div>
                      <p style={{ fontWeight: 700, color: INK }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: MUTE, marginTop: 2 }}>{t.email}</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                          background: isPaid ? GREEN_BG : RED_BG,
                          color: isPaid ? GREEN : RED,
                        }}
                      >
                        {isPaid ? "🟢 Payé" : "🔴 En attente"}
                      </span>

                      <span style={{ fontFamily: display, fontWeight: 800, color: INK }}>{t.rent} €</span>

                      <Link
                        href={`/tenants/${t.id}`}
                        style={{ color: BROWN, textDecoration: "underline", fontSize: 13, fontWeight: 600 }}
                      >
                        Voir
                      </Link>

                      <button
                        onClick={() => unlinkTenant(t.id)}
                        style={{ background: "none", border: "none", color: RED, textDecoration: "underline", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: body }}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RATTACHER UN LOCATAIRE */}
          <div style={{ paddingTop: 18, borderTop: `1px solid ${FIELD_BORDER}` }}>
            <h2 style={sectionTitle}>➕ Rattacher un locataire</h2>

            {allTenants.length === 0 ? (
              <p style={{ fontSize: 14, color: MUTE }}>
                Tous vos locataires sont déjà rattachés à un bien.{" "}
                <Link href="/tenants" style={{ color: BROWN, textDecoration: "underline", fontWeight: 600 }}>
                  Ajouter un locataire
                </Link>
              </p>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  style={{
                    border: `2px solid ${FIELD_BORDER}`, background: FIELD_BG, padding: "11px 14px",
                    borderRadius: 12, fontSize: 14, color: INK, fontFamily: body, outline: "none", flex: 1,
                  }}
                >
                  <option value="">Sélectionner un locataire...</option>
                  {allTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.rent} €
                    </option>
                  ))}
                </select>

                <button
                  onClick={linkTenant}
                  disabled={!selectedTenantId || loadingLink}
                  style={{
                    background: INK, color: CREAM, padding: "11px 22px",
                    borderRadius: 999, border: "none", fontSize: 14, fontWeight: 700, fontFamily: body,
                    cursor: !selectedTenantId || loadingLink ? "not-allowed" : "pointer",
                    opacity: !selectedTenantId || loadingLink ? 0.5 : 1,
                  }}
                >
                  {loadingLink ? "..." : "Rattacher"}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
