"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const PROPERTY_TYPES = [
  "Appartement",
  "Maison",
  "Studio",
  "Chambre",
  "Local commercial",
  "Autre",
];

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("Appartement");
  const [surface, setSurface] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
    fetchAll();
  }, []);

  async function fetchAll() {
    await fetchProperties();
    await fetchTenants();
  }

  async function fetchProperties() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("user_id", userData.user?.id)
      .order("created_at", { ascending: false });
    if (!error) setProperties(data || []);
  }

  async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("user_id", userData.user?.id);
    if (!error) setTenants(data || []);
  }

  async function addProperty() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("properties").insert([{
      user_id: userData.user?.id,
      address, postal_code: postalCode, city, type,
      surface: surface ? Number(surface) : null,
      description, is_vacant: true,
    }]);
    setLoading(false);
    if (!error) { toast.success("Bien ajouté !"); resetForm(); await fetchAll(); }
    else toast.error("Impossible d'ajouter le bien.");
  }

  async function updateProperty() {
    if (!editingId) return;
    setLoading(true);
    const { error } = await supabase
      .from("properties")
      .update({ address, postal_code: postalCode, city, type, surface: surface ? Number(surface) : null, description })
      .eq("id", editingId);
    setLoading(false);
    if (!error) { toast.success("Bien modifié !"); resetForm(); await fetchAll(); }
    else toast.error("Impossible de modifier le bien.");
  }

  async function deleteProperty(id: string) {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (!error) { toast.success("Bien supprimé."); await fetchAll(); }
    else toast.error("Impossible de supprimer le bien.");
  }

  function startEdit(property: any) {
    setEditingId(property.id);
    setAddress(property.address);
    setPostalCode(property.postal_code ?? "");
    setCity(property.city ?? "");
    setType(property.type ?? "Appartement");
    setSurface(property.surface ?? "");
    setDescription(property.description ?? "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null); setAddress(""); setPostalCode(""); setCity("");
    setType("Appartement"); setSurface(""); setDescription(""); setShowForm(false);
  }

  function getTenantsForProperty(propertyId: string) {
    return tenants.filter((t) => t.property_id === propertyId);
  }

  function getTotalRent(propertyId: string) {
    return getTenantsForProperty(propertyId).reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
  }

  const totalProperties = properties.length;
  const vacantCount = properties.filter((p) => p.is_vacant).length;
  const occupiedCount = totalProperties - vacantCount;

  const filteredProperties = properties.filter((p) =>
    [p.address, p.city, p.postal_code, p.type]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* RETOUR */}
        <div style={{ marginBottom: "20px" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "#fff", border: "1px solid #e5e7eb",
            padding: "8px 14px", borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            fontSize: "14px", color: "#374151", textDecoration: "none",
          }}>
            ← Accueil
          </Link>
        </div>

        {/* TITRE */}
        <h1 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "16px" }}>🏠 Mes biens</h1>

        {/* RECHERCHE */}
        <input
          style={{
            border: "1px solid #d1d5db", padding: "10px 14px", width: "100%",
            borderRadius: "10px", marginBottom: "16px", fontSize: "14px", boxSizing: "border-box",
          }}
          placeholder="🔍 Rechercher par adresse ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATS — auto-fill : 1 col sur très petit, 3 col sur grand */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "10px", marginBottom: "20px",
        }}>
          {[
            { label: "Total biens", value: totalProperties, color: "#111827" },
            { label: "Occupés", value: occupiedCount, color: "#16a34a" },
            { label: "Vacants", value: vacantCount, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "12px", padding: "14px 16px",
              border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 4px" }}>{label}</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* BOUTON AJOUTER */}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#2563eb", color: "#fff", padding: "12px 20px",
            borderRadius: "10px", border: "none", cursor: "pointer",
            fontSize: "15px", fontWeight: 600, width: "100%", marginBottom: "16px",
          }}
        >
          + Ajouter un bien
        </button>

        {/* FORMULAIRE */}
        {showForm && (
          <div style={{
            background: "#fff", padding: "20px", borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "20px",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px" }}>
              {editingId ? "Modifier le bien" : "Nouveau bien"}
            </h2>

            <input
              style={{ border: "1px solid #d1d5db", padding: "10px 12px", width: "100%", borderRadius: "8px", marginBottom: "10px", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            {/* Code postal + Ville — s'empilent sur très petit écran */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <input
                style={{ border: "1px solid #d1d5db", padding: "10px 12px", borderRadius: "8px", fontSize: "14px", flex: "1 1 100px", minWidth: "80px", boxSizing: "border-box" }}
                placeholder="Code postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              <input
                style={{ border: "1px solid #d1d5db", padding: "10px 12px", borderRadius: "8px", fontSize: "14px", flex: "2 1 160px", minWidth: "120px", boxSizing: "border-box" }}
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <select
              style={{ border: "1px solid #d1d5db", padding: "10px 12px", width: "100%", borderRadius: "8px", marginBottom: "10px", fontSize: "14px", color: "#374151", background: "#fff", boxSizing: "border-box" }}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <input
              style={{ border: "1px solid #d1d5db", padding: "10px 12px", width: "100%", borderRadius: "8px", marginBottom: "10px", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Surface (m²)"
              type="number"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />

            <textarea
              style={{ border: "1px solid #d1d5db", padding: "10px 12px", width: "100%", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
              placeholder="Description (optionnel)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={editingId ? updateProperty : addProperty}
                disabled={loading}
                style={{
                  background: "#16a34a", color: "#fff", padding: "10px 20px",
                  borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "14px", fontWeight: 600, flex: 1,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Enregistrement..." : editingId ? "Modifier" : "Ajouter"}
              </button>
              <button
                onClick={resetForm}
                style={{
                  background: "#f3f4f6", color: "#374151", padding: "10px 20px",
                  borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "14px", flex: 1,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* LISTE DES BIENS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredProperties.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#9ca3af" }}>
              {search ? "Aucun bien trouvé." : "Aucun bien pour le moment."}
            </p>
          ) : (
            filteredProperties.map((p) => {
              const propertyTenants = getTenantsForProperty(p.id);
              const totalRent = getTotalRent(p.id);
              const isVacant = propertyTenants.length === 0;

              return (
                <div key={p.id} style={{
                  background: "#fff", borderRadius: "12px", padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {/* Ligne 1 : adresse + badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "4px" }}>
                    <p style={{ fontWeight: 600, fontSize: "15px", margin: 0 }}>{p.address}</p>
                    <span style={{
                      flexShrink: 0,
                      padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                      background: isVacant ? "#fee2e2" : "#dcfce7",
                      color: isVacant ? "#dc2626" : "#16a34a",
                    }}>
                      {isVacant ? "🔴 Vacant" : `🟢 ${propertyTenants.length} loc.`}
                    </span>
                  </div>

                  {/* Ligne 2 : ville + type */}
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 2px" }}>{p.postal_code} {p.city}</p>
                  <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 8px" }}>
                    {p.type}{p.surface ? ` · ${p.surface} m²` : ""}
                  </p>

                  {/* Ligne 3 : loyer */}
                  {totalRent > 0 && (
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>{totalRent} €/mois</p>
                  )}

                  {/* Ligne 4 : actions */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        background: "#f59e0b", color: "#fff", padding: "8px 14px",
                        borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => deleteProperty(p.id)}
                      style={{
                        background: "#ef4444", color: "#fff", padding: "8px 14px",
                        borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                      }}
                    >
                      🗑 Supprimer
                    </button>
                    <Link href={`/properties/${p.id}`} style={{
                      background: "#eff6ff", color: "#2563eb", padding: "8px 14px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: 500, textDecoration: "none",
                    }}>
                      📂 Voir le détail
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}
