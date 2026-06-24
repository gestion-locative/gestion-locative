"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

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
    if (tenantList.length === 0) { setPayments({}); return; }
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const ids = tenantList.map((t) => t.id);
    const { data, error } = await supabase
      .from("payments").select("*")
      .in("tenant_id", ids).eq("month", monthKey);
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
    if (property) updateVacancyStatus(tenants.length);
  }, [tenants]);

  if (!property) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <p style={{ color: "#6b7280" }}>Chargement...</p>
      </div>
    );
  }

  const totalRent = tenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* RETOUR */}
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "14px", color: "#6b7280", marginBottom: "20px",
            display: "inline-flex", alignItems: "center", gap: "4px", padding: 0,
          }}
        >
          ← Retour
        </button>

        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f3f4f6", padding: "20px", marginBottom: "16px" }}>

          {/* INFOS DU BIEN */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", margin: 0 }}>{property.address}</h1>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0" }}>{property.postal_code} {property.city}</p>
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: "2px 0 0" }}>
                {property.type}{property.surface ? ` · ${property.surface} m²` : ""}
              </p>
              {property.description && (
                <p style={{ fontSize: "13px", color: "#9ca3af", margin: "2px 0 0", fontStyle: "italic" }}>{property.description}</p>
              )}
            </div>

            <span style={{
              flexShrink: 0,
              padding: "4px 12px", borderRadius: "999px", fontSize: "13px", fontWeight: 600,
              background: tenants.length === 0 ? "#fee2e2" : "#dcfce7",
              color: tenants.length === 0 ? "#dc2626" : "#16a34a",
            }}>
              {tenants.length === 0 ? "🔴 Vacant" : `🟢 ${tenants.length} locataire${tenants.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* STATS — 2 colonnes sur mobile, 3 sur desktop via auto-fill */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "10px",
            marginBottom: "24px",
          }}>
            <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 4px" }}>Loyer total</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>{totalRent} €</p>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 4px" }}>Payé ce mois</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#16a34a", margin: 0 }}>{paidCount}</p>
            </div>
            <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 4px" }}>En attente</p>
              <p style={{ fontSize: "18px", fontWeight: 700, color: "#dc2626", margin: 0 }}>{tenants.length - paidCount}</p>
            </div>
          </div>

          {/* LOCATAIRES */}
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>👥 Locataires</h2>

          {tenants.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "16px" }}>Aucun locataire rattaché à ce bien.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              {tenants.map((t) => {
                const isPaid = !!payments[t.id]?.is_paid;
                return (
                  <div key={t.id} style={{
                    border: "1px solid #f3f4f6", borderRadius: "10px", padding: "12px 14px",
                  }}>
                    {/* Ligne 1 : nom + loyer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <p style={{ fontWeight: 600, fontSize: "14px", margin: 0 }}>{t.name}</p>
                      <p style={{ fontWeight: 700, fontSize: "14px", margin: 0, marginLeft: "8px", whiteSpace: "nowrap" }}>{t.rent} €</p>
                    </div>

                    {/* Ligne 2 : email */}
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 8px" }}>{t.email}</p>

                    {/* Ligne 3 : badge + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                        background: isPaid ? "#dcfce7" : "#fee2e2",
                        color: isPaid ? "#16a34a" : "#dc2626",
                      }}>
                        {isPaid ? "🟢 Payé" : "🔴 En attente"}
                      </span>

                      <Link href={`/tenants/${t.id}`} style={{
                        fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500,
                      }}>
                        Voir le dossier
                      </Link>

                      <button onClick={() => unlinkTenant(t.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "12px", color: "#ef4444", fontWeight: 500, padding: 0,
                      }}>
                        Retirer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RATTACHER UN LOCATAIRE */}
          <div style={{ paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
            <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>➕ Rattacher un locataire</h2>

            {allTenants.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#9ca3af" }}>
                Tous vos locataires sont déjà rattachés à un bien.{" "}
                <Link href="/tenants" style={{ color: "#2563eb" }}>Ajouter un locataire</Link>
              </p>
            ) : (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  style={{
                    border: "1px solid #d1d5db", padding: "10px 12px", borderRadius: "8px",
                    fontSize: "13px", color: "#374151", flex: 1, minWidth: "160px",
                    background: "#fff", boxSizing: "border-box",
                  }}
                >
                  <option value="">Sélectionner un locataire...</option>
                  {allTenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.rent} €</option>
                  ))}
                </select>

                <button
                  onClick={linkTenant}
                  disabled={!selectedTenantId || loadingLink}
                  style={{
                    background: "#2563eb", color: "#fff", padding: "10px 18px",
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    fontSize: "13px", fontWeight: 600, opacity: (!selectedTenantId || loadingLink) ? 0.5 : 1,
                    whiteSpace: "nowrap",
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