"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rent, setRent] = useState("");
  const [rentDueDay, setRentDueDay] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
  }, []);

  useEffect(() => {
    fetchTenants();
    fetchProperties();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.push("/login");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tenants").select("*").eq("user_id", userData.user?.id)
      .order("created_at", { ascending: false });
    if (error) { console.log(error); return; }
    setTenants(data || []);
    await fetchPayments(data || []);
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) { setPayments({}); return; }
    const monthKey = getCurrentMonthKey();
    const ids = tenantList.map((t) => t.id);
    const { data, error } = await supabase.from("payments").select("*")
      .in("tenant_id", ids).eq("month", monthKey);
    if (error) { console.log("Erreur fetch payments:", error); return; }
    const map: Record<string, any> = {};
    (data || []).forEach((p) => { map[p.tenant_id] = p; });
    setPayments(map);
  }

  async function fetchProperties() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("properties").select("*")
      .eq("user_id", userData.user?.id).order("created_at", { ascending: false });
    if (!error) setProperties(data || []);
  }

  async function addTenant() {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("tenants").insert([{
      name: `${name} ${firstName}`.trim(), email,
      rent: rent ? Number(rent) : null,
      rent_due_day: rentDueDay ? Number(rentDueDay) : null,
      property_address: propertyAddress,
      phone,
      // Relance auto désactivée par défaut — se configure dans la fiche locataire
      auto_reminder_enabled: false,
      reminder_days: [],
      auto_receipt_enabled: false,
      user_id: userData.user?.id,
      property_id: propertyId || null,
    }]);
    if (!error) { resetForm(); await fetchTenants(); }
    else console.log(error);
  }

  async function deleteTenant(id: string) {
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (!error) fetchTenants();
    else toast.error("Erreur lors de la suppression.");
  }

  async function updateTenant() {
    if (editingIndex === null) return;
    const tenant = tenants[editingIndex];
    const { error } = await supabase.from("tenants").update({
      name: `${name} ${firstName}`.trim(), email,
      rent: rent ? Number(rent) : null,
      rent_due_day: rentDueDay ? Number(rentDueDay) : null,
      property_address: propertyAddress,
      phone,
      property_id: propertyId || null,
    }).eq("id", tenant.id);
    if (!error) { await fetchTenants(); resetForm(); }
    else console.log(error);
  }

  function startEdit(index: number) {
    const tenant = tenants[index];
    const parts = tenant.name ? tenant.name.split(" ") : [];
    setName(parts[0] ?? "");
    setFirstName(parts.slice(1).join(" ") ?? "");
    setEmail(tenant.email);
    setRent(tenant.rent);
    setRentDueDay(tenant.rent_due_day ?? "");
    setPropertyAddress(tenant.property_address ?? "");
    setPhone(tenant.phone ?? "");
    setEditingIndex(index);
    setShowForm(true);
    setPropertyId(tenant.property_id ?? "");
  }

  function resetForm() {
    setName(""); setEmail(""); setRent(""); setRentDueDay("");
    setPropertyAddress(""); setPhone("");
    setEditingIndex(null); setShowForm(false); setPropertyId("");
    setFirstName("");
  }

  function getDueStatus(tenant: any, isPaid: boolean) {
    if (!tenant.rent_due_day || isPaid) return null;
    const today = new Date();
    const dueDay = Number(tenant.rent_due_day);
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    dueDate.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { type: "late", label: `🔴 Retard ${Math.abs(diffDays)}j` };
    if (diffDays === 0) return { type: "today", label: "⚠️ Échéance auj." };
    if (diffDays <= 3) return { type: "soon", label: `⚠️ Dans ${diffDays}j` };
    return null;
  }

  const filteredTenants = tenants.filter((t) =>
    [t.name, t.email, t.property_address].filter(Boolean)
      .some((field) => field.toLowerCase().includes(search.toLowerCase()))
  );

  const totalTenants = tenants.length;
  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;
  const pendingCount = totalTenants - paidCount;
  const totalCollected = tenants.filter((t) => payments[t.id]?.is_paid).reduce((sum, t) => sum + (t.rent || 0), 0);

  return (
    <main style={{ minHeight: "100vh", background: CREAM, padding: 16, fontFamily: body, position: "relative", overflow: "hidden" }}>
      <div style={{ pointerEvents: "none", position: "absolute", right: -120, top: -140, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ffd166, #f9a826 60%, #f4801f)", opacity: 0.8 }} />

      <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: `2px solid ${FIELD_BORDER}`, padding: "9px 16px", borderRadius: 999, fontSize: 14, fontWeight: 700, color: INK, textDecoration: "none", whiteSpace: "nowrap" }}>
            ← Accueil
          </Link>
        </div>

        <p style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BROWN, marginBottom: 8 }}>Gestion locative</p>
        <h1 style={{ fontFamily: display, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: INK, marginBottom: 18 }}>👥 Locataires</h1>

        <input
          style={{ ...fieldStyle, marginBottom: 16, fontSize: 15 }}
          placeholder="🔍 Rechercher par nom, email ou adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${FIELD_BORDER}` }}>
          {[
            { label: "Locataires", value: totalTenants },
            { label: "Encaissés", value: paidCount },
            { label: "En attente", value: pendingCount },
            { label: "Montant encaissé", value: `${totalCollected} €` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTE, marginBottom: 3 }}>{label}</p>
              <p style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: "#5c4a2e", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* BOUTON AJOUTER */}
        <button onClick={() => setShowForm(!showForm)} style={{ background: INK, color: CREAM, padding: "14px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: body, width: "100%", marginBottom: 16, boxShadow: "0 8px 20px -8px rgba(26,18,8,0.5)" }}>
          {showForm ? "Fermer" : "+ Ajouter un locataire"}
        </button>

        {/* FORMULAIRE — sans les options d'automatisation */}
        {showForm && (
          <div style={{ background: "#fff", padding: 22, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -28px rgba(120,53,15,0.4)", marginBottom: 20 }}>
            <h2 style={{ fontFamily: display, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 4 }}>
              {editingIndex !== null ? "Modifier locataire" : "Nouveau locataire"}
            </h2>
            <p style={{ fontSize: 12.5, color: MUTE, marginBottom: 16 }}>
              Les options d'automatisation (relance, quittance) se configurent dans la fiche du locataire.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { placeholder: "Nom", value: name, onChange: setName },
                { placeholder: "Prénom", value: firstName, onChange: setFirstName },
                { placeholder: "Email", value: email, onChange: setEmail },
                { placeholder: "Téléphone", value: phone, onChange: setPhone },
                { placeholder: "Adresse du bien (ex: 12 rue des Lilas, Paris)", value: propertyAddress, onChange: setPropertyAddress },
                { placeholder: "Loyer (€)", value: rent, onChange: setRent },
              ].map(({ placeholder, value, onChange }) => (
                <input key={placeholder} style={fieldStyle} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
              ))}
              <select style={{ ...fieldStyle, color: INK, background: FIELD_BG }} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Aucun bien rattaché</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.address} — {p.city}</option>
                ))}
              </select>

              <input type="number" min="1" max="31" style={fieldStyle} placeholder="Jour du mois pour l'échéance (ex: 5)" value={rentDueDay} onChange={(e) => setRentDueDay(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={editingIndex !== null ? updateTenant : addTenant} style={{ background: INK, color: CREAM, padding: "12px 20px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: body, flex: 1 }}>
                {editingIndex !== null ? "Modifier" : "Ajouter"}
              </button>
              <button onClick={resetForm} style={{ background: "transparent", color: INK, padding: "12px 20px", borderRadius: 999, border: `2px solid ${INK}`, cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: body, flex: 1 }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* LISTE LOCATAIRES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredTenants.map((t, i) => {
            const isPaid = !!payments[t.id]?.is_paid;
            const dueStatus = getDueStatus(t, isPaid);
            let badgeLabel = "🟢 Payé"; let badgeBg = GREEN_BG; let badgeColor = GREEN;
            if (!isPaid) {
              if (dueStatus?.type === "late") { badgeLabel = dueStatus.label; badgeBg = RED_BG; badgeColor = RED; }
              else if (dueStatus?.type === "today" || dueStatus?.type === "soon") { badgeLabel = dueStatus.label; badgeBg = AMBER_BG; badgeColor = AMBER; }
              else { badgeLabel = "🔴 En attente"; badgeBg = RED_BG; badgeColor = RED; }
            }

            return (
              <div key={t.id ?? t.email} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <p style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: INK, margin: 0 }}>{t.name}</p>
                  <p style={{ fontFamily: display, fontWeight: 800, fontSize: 17, color: INK, margin: 0, whiteSpace: "nowrap", marginLeft: 8 }}>{t.rent} €</p>
                </div>
                <p style={{ fontSize: 13, color: "#7a684f", margin: "0 0 2px" }}>{t.email}</p>
                {t.property_address && <p style={{ fontSize: 13, color: MUTE, margin: "0 0 8px" }}>📍 {t.property_address}</p>}

                {/* Badges automatisation */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ display: "inline-block", background: badgeBg, color: badgeColor, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                    {badgeLabel}
                  </span>
                  {t.auto_reminder_enabled && (
                    <span style={{ display: "inline-block", background: AMBER_BG, color: AMBER, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      🌞 Relance auto
                    </span>
                  )}
                  {t.auto_receipt_enabled && (
                    <span style={{ display: "inline-block", background: GREEN_BG, color: GREEN, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                      📄 Quittance auto
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => startEdit(i)} style={{ background: CREAM, color: BROWN, padding: "8px 14px", borderRadius: 999, border: `1px solid ${FIELD_BORDER}`, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: body }}>
                    ✏️ Modifier
                  </button>
                  <button onClick={() => deleteTenant(t.id)} style={{ background: RED_BG, color: RED, padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: body }}>
                    🗑 Supprimer
                  </button>
                  <Link href={`/tenants/${t.id}`} style={{ background: INK, color: CREAM, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                    📂 Voir le dossier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
