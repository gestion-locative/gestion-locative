"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------
   Biens Loya — thème solaire, styles 100% en ligne (aucune dépendance
   Tailwind). Toute la logique est identique à l'original.
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

const fieldStyle: React.CSSProperties = {
  border: `2px solid ${FIELD_BORDER}`,
  background: FIELD_BG,
  padding: "11px 14px",
  width: "100%",
  borderRadius: 12,
  fontSize: 14,
  color: INK,
  fontFamily: body,
  outline: "none",
  boxSizing: "border-box",
};

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
    <main style={{ minHeight: "100vh", background: CREAM, padding: 16, fontFamily: body, position: "relative", overflow: "hidden" }}>
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

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>

        {/* RETOUR */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", border: `2px solid ${FIELD_BORDER}`,
            padding: "9px 16px", borderRadius: 999,
            fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none",
          }}>
            ← Accueil
          </Link>
        </div>

        {/* TITRE */}
        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>
          Gestion locative
        </p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 18 }}>
          🏠 Mes biens
        </h1>

        {/* RECHERCHE */}
        <input
          style={{ ...fieldStyle, marginBottom: 16, fontSize: 15 }}
          placeholder="🔍 Rechercher par adresse ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATS (discret, second plan) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${FIELD_BORDER}` }}>
          {[
            { label: "Total biens", value: totalProperties },
            { label: "Occupés", value: occupiedCount },
            { label: "Vacants", value: vacantCount },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTE, marginBottom: 3 }}>{label}</p>
              <p style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: "#5c4a2e", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* BOUTON AJOUTER */}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: INK, color: CREAM, padding: "14px 20px",
            borderRadius: 999, border: "none", cursor: "pointer",
            fontSize: 15, fontWeight: 700, fontFamily: body, width: "100%", marginBottom: 16,
            boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)",
          }}
        >
          {showForm ? "Fermer" : "+ Ajouter un bien"}
        </button>

        {/* FORMULAIRE */}
        {showForm && (
          <div style={{ background: "#fff", padding: 22, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -28px rgba(120,53,15,0.4)", marginBottom: 20 }}>
            <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 16 }}>
              {editingId ? "Modifier le bien" : "Nouveau bien"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                style={fieldStyle}
                placeholder="Adresse"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  style={{ ...fieldStyle, flex: "1 1 100px", minWidth: 80, width: "auto" }}
                  placeholder="Code postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <input
                  style={{ ...fieldStyle, flex: "2 1 160px", minWidth: 120, width: "auto" }}
                  placeholder="Ville"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <select
                style={fieldStyle}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <input
                style={fieldStyle}
                placeholder="Surface (m²)"
                type="number"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
              />

              <textarea
                style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
                placeholder="Description (optionnel)"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={editingId ? updateProperty : addProperty}
                disabled={loading}
                style={{
                  background: INK, color: CREAM, padding: "12px 20px",
                  borderRadius: 999, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, fontFamily: body, flex: 1,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Enregistrement..." : editingId ? "Modifier" : "Ajouter"}
              </button>
              <button
                onClick={resetForm}
                style={{
                  background: "transparent", color: INK, padding: "12px 20px",
                  borderRadius: 999, border: `2px solid ${INK}`, cursor: "pointer",
                  fontSize: 14, fontWeight: 700, fontFamily: body, flex: 1,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* LISTE DES BIENS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredProperties.length === 0 ? (
            <p style={{ fontSize: 14, color: MUTE }}>
              {search ? "Aucun bien trouvé." : "Aucun bien pour le moment."}
            </p>
          ) : (
            filteredProperties.map((p) => {
              const propertyTenants = getTenantsForProperty(p.id);
              const totalRent = getTotalRent(p.id);
              const isVacant = propertyTenants.length === 0;

              return (
                <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: `1px solid ${BORDER}` }}>
                  {/* Ligne 1 : adresse + badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{p.address}</p>
                    <span style={{
                      flexShrink: 0,
                      padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                      background: isVacant ? RED_BG : GREEN_BG,
                      color: isVacant ? RED : GREEN,
                    }}>
                      {isVacant ? "🔴 Vacant" : `🟢 ${propertyTenants.length} loc.`}
                    </span>
                  </div>

                  {/* Ligne 2 : ville + type */}
                  <p style={{ fontSize: 13, color: "#7a684f", margin: "0 0 2px" }}>{p.postal_code} {p.city}</p>
                  <p style={{ fontSize: 13, color: MUTE, margin: "0 0 8px" }}>
                    {p.type}{p.surface ? ` · ${p.surface} m²` : ""}
                  </p>

                  {/* Ligne 3 : loyer */}
                  {totalRent > 0 && (
                    <p style={{ fontFamily: display, fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 10px" }}>{totalRent} €/mois</p>
                  )}

                  {/* Ligne 4 : actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        background: CREAM, color: BROWN, padding: "8px 14px",
                        borderRadius: 999, border: `1px solid ${FIELD_BORDER}`, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: body,
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => deleteProperty(p.id)}
                      style={{
                        background: RED_BG, color: RED, padding: "8px 14px",
                        borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: body,
                      }}
                    >
                      🗑 Supprimer
                    </button>
                    <Link href={`/properties/${p.id}`} style={{
                      background: INK, color: CREAM, padding: "8px 14px",
                      borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: "none",
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
