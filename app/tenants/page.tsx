"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");

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
      .from("tenants")
      .select("*")
      .eq("user_id", userData.user?.id)
      .order("created_at", { ascending: false });

    if (error) { console.log(error); return; }
    setTenants(data || []);
    await fetchPayments(data || []);
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) { setPayments({}); return; }
    const monthKey = getCurrentMonthKey();
    const ids = tenantList.map((t) => t.id);
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .in("tenant_id", ids)
      .eq("month", monthKey);

    if (error) { console.log("Erreur fetch payments:", error); return; }
    const map: Record<string, any> = {};
    (data || []).forEach((p) => { map[p.tenant_id] = p; });
    setPayments(map);
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

  function toggleReminderDay(day: number) {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function addTenant() {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("tenants").insert([{
      name, email,
      rent: rent ? Number(rent) : null,
      rent_due_day: rentDueDay ? Number(rentDueDay) : null,
      property_address: propertyAddress,
      phone,
      auto_reminder_enabled: autoReminderEnabled,
      reminder_days: reminderDays,
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
    const { error } = await supabase
      .from("tenants")
      .update({
        name, email,
        rent: rent ? Number(rent) : null,
        rent_due_day: rentDueDay ? Number(rentDueDay) : null,
        property_address: propertyAddress,
        phone,
        auto_reminder_enabled: autoReminderEnabled,
        reminder_days: reminderDays,
        property_id: propertyId || null,
      })
      .eq("id", tenant.id);
    if (!error) { await fetchTenants(); resetForm(); }
    else console.log(error);
  }

  function startEdit(index: number) {
    const tenant = tenants[index];
    setName(tenant.name);
    setEmail(tenant.email);
    setRent(tenant.rent);
    setRentDueDay(tenant.rent_due_day ?? "");
    setPropertyAddress(tenant.property_address ?? "");
    setPhone(tenant.phone ?? "");
    setAutoReminderEnabled(tenant.auto_reminder_enabled ?? false);
    setReminderDays(tenant.reminder_days ?? []);
    setEditingIndex(index);
    setShowForm(true);
    setPropertyId(tenant.property_id ?? "");
  }

  function resetForm() {
    setName(""); setEmail(""); setRent(""); setRentDueDay("");
    setPropertyAddress(""); setPhone(""); setAutoReminderEnabled(false);
    setReminderDays([]); setEditingIndex(null); setShowForm(false); setPropertyId("");
  }

  function getDueStatus(tenant: any, isPaid: boolean) {
    if (!tenant.rent_due_day || isPaid) return null;
    const today = new Date();
    const dueDay = Number(tenant.rent_due_day);
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    dueDate.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return { type: "late", label: `🔴 Retard ${Math.abs(diffDays)}j` };
    if (diffDays === 0) return { type: "today", label: "⚠️ Échéance auj." };
    if (diffDays <= 3) return { type: "soon", label: `⚠️ Dans ${diffDays}j` };
    return null;
  }

  const filteredTenants = tenants.filter((t) =>
    [t.name, t.email, t.property_address]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(search.toLowerCase()))
  );

  // Stats
  const totalTenants = tenants.length;
  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;
  const pendingCount = totalTenants - paidCount;
  const totalCollected = tenants
    .filter((t) => payments[t.id]?.is_paid)
    .reduce((sum, t) => sum + (t.rent || 0), 0);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "16px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* NAVIGATION — wraps on mobile */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "24px",
        }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "#fff", border: "1px solid #e5e7eb",
              padding: "8px 14px", borderRadius: "10px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              fontSize: "14px", color: "#374151", textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← Accueil
          </Link>
        </div>

        {/* TITRE */}
        <h1 style={{ fontSize: "26px", fontWeight: 700, marginBottom: "16px" }}>
          👥 Locataires
        </h1>

        {/* RECHERCHE */}
        <input
          style={{
            border: "1px solid #d1d5db", padding: "10px 14px",
            width: "100%", borderRadius: "10px", marginBottom: "16px",
            fontSize: "14px", boxSizing: "border-box",
          }}
          placeholder="🔍 Rechercher par nom, email ou adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* STATS — grille 2 colonnes toujours */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "16px",
        }}>
          {[
            { label: "Locataires", value: totalTenants, color: "#1f2937" },
            { label: "Loyers encaissés", value: paidCount, color: "#16a34a" },
            { label: "En attente", value: pendingCount, color: "#dc2626" },
            { label: "Montant encaissé", value: `${totalCollected} €`, color: "#1f2937" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "12px", padding: "14px 16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
            }}>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{label}</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* BOUTON AJOUTER */}
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#2563eb", color: "#fff",
            padding: "12px 20px", borderRadius: "10px",
            border: "none", cursor: "pointer",
            fontSize: "15px", fontWeight: 600,
            width: "100%", marginBottom: "16px",
          }}
        >
          + Ajouter un locataire
        </button>

        {/* FORMULAIRE */}
        {showForm && (
          <div style={{
            background: "#fff", padding: "20px", borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "20px",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "14px" }}>
              {editingIndex !== null ? "Modifier locataire" : "Nouveau locataire"}
            </h2>

            {[
              { placeholder: "Nom", value: name, onChange: setName },
              { placeholder: "Email", value: email, onChange: setEmail },
              { placeholder: "Téléphone", value: phone, onChange: setPhone },
              { placeholder: "Adresse du bien (ex: 12 rue des Lilas, Paris)", value: propertyAddress, onChange: setPropertyAddress },
              { placeholder: "Loyer (€)", value: rent, onChange: setRent },
            ].map(({ placeholder, value, onChange }) => (
              <input
                key={placeholder}
                style={{
                  border: "1px solid #d1d5db", padding: "10px 12px",
                  width: "100%", borderRadius: "8px", marginBottom: "10px",
                  fontSize: "14px", boxSizing: "border-box",
                }}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            ))}

            <select
              style={{
                border: "1px solid #d1d5db", padding: "10px 12px",
                width: "100%", borderRadius: "8px", marginBottom: "10px",
                fontSize: "14px", color: "#374151", boxSizing: "border-box",
                background: "#fff",
              }}
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="">Aucun bien rattaché</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address} — {p.city}
                </option>
              ))}
            </select>

            <input
              type="number" min="1" max="31"
              style={{
                border: "1px solid #d1d5db", padding: "10px 12px",
                width: "100%", borderRadius: "8px", marginBottom: "14px",
                fontSize: "14px", boxSizing: "border-box",
              }}
              placeholder="Jour du mois pour l'échéance (ex: 5)"
              value={rentDueDay}
              onChange={(e) => setRentDueDay(e.target.value)}
            />

            {/* RELANCE AUTO */}
            <div style={{
              border: "1px solid #e5e7eb", borderRadius: "10px",
              padding: "14px", marginBottom: "16px",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoReminderEnabled}
                  onChange={(e) => setAutoReminderEnabled(e.target.checked)}
                />
                Activer la relance automatique
              </label>

              {autoReminderEnabled && (
                <div style={{ marginTop: "12px", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Envoyer une relance :</p>
                  {REMINDER_OPTIONS.map((opt) => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#4b5563", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={reminderDays.includes(opt.value)}
                        onChange={() => toggleReminderDay(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={editingIndex !== null ? updateTenant : addTenant}
                style={{
                  background: "#16a34a", color: "#fff",
                  padding: "10px 20px", borderRadius: "8px",
                  border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600,
                  flex: 1,
                }}
              >
                {editingIndex !== null ? "Modifier" : "Ajouter"}
              </button>
              <button
                onClick={resetForm}
                style={{
                  background: "#f3f4f6", color: "#374151",
                  padding: "10px 20px", borderRadius: "8px",
                  border: "none", cursor: "pointer", fontSize: "14px",
                  flex: 1,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* LISTE LOCATAIRES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredTenants.map((t, i) => {
            const isPaid = !!payments[t.id]?.is_paid;
            const dueStatus = getDueStatus(t, isPaid);

            let badgeLabel = "🟢 Payé";
            let badgeBg = "#dcfce7";
            let badgeColor = "#15803d";

            if (!isPaid) {
              if (dueStatus?.type === "late") {
                badgeLabel = dueStatus.label;
                badgeBg = "#fee2e2"; badgeColor = "#dc2626";
              } else if (dueStatus?.type === "today" || dueStatus?.type === "soon") {
                badgeLabel = dueStatus.label;
                badgeBg = "#fef3c7"; badgeColor = "#d97706";
              } else {
                badgeLabel = "🔴 En attente";
                badgeBg = "#fee2e2"; badgeColor = "#dc2626";
              }
            }

            return (
              <div
                key={t.id ?? t.email}
                style={{
                  background: "#fff", borderRadius: "12px",
                  padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {/* Ligne 1 : nom + loyer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <p style={{ fontWeight: 600, fontSize: "15px", margin: 0 }}>{t.name}</p>
                  <p style={{ fontWeight: 700, fontSize: "16px", margin: 0, whiteSpace: "nowrap", marginLeft: "8px" }}>
                    {t.rent} €
                  </p>
                </div>

                {/* Ligne 2 : email */}
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 2px" }}>{t.email}</p>

                {/* Ligne 3 : adresse */}
                {t.property_address && (
                  <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 8px" }}>
                    📍 {t.property_address}
                  </p>
                )}

                {/* Ligne 4 : badge statut */}
                <div style={{ marginBottom: "12px" }}>
                  <span style={{
                    display: "inline-block",
                    background: badgeBg, color: badgeColor,
                    padding: "4px 10px", borderRadius: "999px",
                    fontSize: "12px", fontWeight: 600,
                  }}>
                    {badgeLabel}
                  </span>
                </div>

                {/* Ligne 5 : actions */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => startEdit(i)}
                    style={{
                      background: "#f59e0b", color: "#fff",
                      padding: "8px 14px", borderRadius: "8px",
                      border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                    }}
                  >
                    ✏️ Modifier
                  </button>

                  <button
                    onClick={() => deleteTenant(t.id)}
                    style={{
                      background: "#ef4444", color: "#fff",
                      padding: "8px 14px", borderRadius: "8px",
                      border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                    }}
                  >
                    🗑 Supprimer
                  </button>

                  <Link
                    href={`/tenants/${t.id}`}
                    style={{
                      background: "#eff6ff", color: "#2563eb",
                      padding: "8px 14px", borderRadius: "8px",
                      fontSize: "13px", fontWeight: 500,
                      textDecoration: "none", display: "inline-block",
                    }}
                  >
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