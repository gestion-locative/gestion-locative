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
        if (!data.user) {
        router.push("/login");
        }
    });
    }, []);

    useEffect(() => {
      fetchTenants();
      fetchProperties();
    }, []);

    useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
        router.push("/login");
        }
    });

    return () => {
        listener.subscription.unsubscribe();
    };
    }, []);

    async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", userData.user?.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    setTenants(data || []);
    await fetchPayments(data || []);
    }

    async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) {
        setPayments({});
        return;
    }

    const monthKey = getCurrentMonthKey();
    const ids = tenantList.map((t) => t.id);

    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .in("tenant_id", ids)
        .eq("month", monthKey);

    if (error) {
        console.log("Erreur fetch payments:", error);
        return;
    }

    const map: Record<string, any> = {};
    (data || []).forEach((p) => {
        map[p.tenant_id] = p;
    });
    setPayments(map);
    }

    function toggleReminderDay(day: number) {
        setReminderDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
        );
    }

    async function addTenant() {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("tenants").insert([
        {
        name,
        email,
        rent: rent ? Number(rent) : null,
        rent_due_day: rentDueDay ? Number(rentDueDay) : null,
        property_address: propertyAddress,
        phone,
        auto_reminder_enabled: autoReminderEnabled,
        reminder_days: reminderDays,
        user_id: userData.user?.id,
        property_id: propertyId || null,
        },
    ]);

    if (!error) {
        resetForm();
        await fetchTenants();
    } else {
        console.log(error);
    }
    }

    async function deleteTenant(id: string) {
    const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", id);

    if (!error) {
        fetchTenants();
    } else {
        toast.error("Erreur lors de la suppression.");
    }
    }

    async function updateTenant() {
    if (editingIndex === null) return;

    const tenant = tenants[editingIndex];

    const { error } = await supabase
        .from("tenants")
        .update({
        name,
        email,
        rent: rent ? Number(rent) : null,
        rent_due_day: rentDueDay ? Number(rentDueDay) : null,
        property_address: propertyAddress,
        phone,
        auto_reminder_enabled: autoReminderEnabled,
        reminder_days: reminderDays,
        property_id: propertyId || null,
        })
        .eq("id", tenant.id);

    if (!error) {
        await fetchTenants();
        resetForm();
    } else {
        console.log(error);
    }
    }

    async function signOut() {
        await supabase.auth.signOut();
        router.push("/login");
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
        setName("");
        setEmail("");
        setRent("");
        setRentDueDay("");
        setPropertyAddress("");
        setPhone("");
        setAutoReminderEnabled(false);
        setReminderDays([]);
        setEditingIndex(null);
        setShowForm(false);
        setPropertyId("");
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

        if (diffDays < 0) {
            return {
                type: "late",
                label: `🔴 Retard ${Math.abs(diffDays)}j`,
            };
        } else if (diffDays === 0) {
            return { type: "today", label: "⚠️ Échéance auj." };
        } else if (diffDays <= 3) {
            return {
                type: "soon",
                label: `⚠️ Dans ${diffDays}j`,
            };
        }

        return null;
    }

    const totalTenants = tenants.length;
    const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;
    const pendingCount = totalTenants - paidCount;
    const collectedAmount = tenants
      .filter((t) => payments[t.id]?.is_paid)
      .reduce((sum, t) => sum + (Number(t.rent) || 0), 0);

    const filteredTenants = tenants.filter((t) =>
      [t.name, t.email, t.property_address]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(search.toLowerCase()))
    );

  return (
    <main className="min-h-screen bg-gray-50 p-10">

    <div className="max-w-3xl mx-auto">

    <div className="mb-6 flex items-center justify-between gap-3">

        <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
        >
            ← Accueil
        </Link>

        <Link
            href="/profile"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
        >
            👤 Mon profil
        </Link>

        <Link
          href="/properties"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
        >
          🏠 Mes biens
        </Link>

        <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
            Se déconnecter
        </button>

    </div>

        
        <h1 className="text-3xl font-bold mb-6">
          👥 Locataires
        </h1>

        <input
          className="border p-2 w-full rounded-lg mb-6 text-sm"
          placeholder="🔍 Rechercher par nom, email ou adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* DASHBOARD STATISTIQUES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Locataires</p>
            <p className="text-2xl font-bold text-gray-900">{totalTenants}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Loyers encaissés</p>
            <p className="text-2xl font-bold text-green-600">{paidCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">En attente</p>
            <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Montant encaissé</p>
            <p className="text-2xl font-bold text-gray-900">{collectedAmount.toLocaleString("fr-FR")} €</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Ajouter un locataire
        </button>

        {/* FORMULAIRE */}
        {showForm && (
          <div className="bg-white p-6 mt-6 rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-4">
              {editingIndex !== null ? "Modifier locataire" : "Nouveau locataire"}
            </h2>

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <select
              className="border p-2 w-full mb-2 rounded text-gray-700"
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
              className="border p-2 w-full mb-2 rounded"
              placeholder="Adresse du bien (ex: 12 rue des Lilas, Paris)"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
            />

            <input
              className="border p-2 w-full mb-4 rounded"
              placeholder="Loyer"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />

            <input
            type="number"
            min="1"
            max="31"
            className="border p-2 w-full mb-4 rounded"
            placeholder="Date du mois à laquelle vous voulez que le loyer soit payé"
            value={rentDueDay}
            onChange={(e) => setRentDueDay(e.target.value)}
            />

            {/* RELANCE AUTOMATIQUE */}
            <div className="mb-4 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={autoReminderEnabled}
                  onChange={(e) => setAutoReminderEnabled(e.target.checked)}
                />
                Activer la relance automatique pour ce locataire
              </label>

              {autoReminderEnabled && (
                <div className="mt-3 pl-6 flex flex-col gap-1">
                  <p className="text-xs text-gray-500 mb-1">Envoyer une relance :</p>
                  {REMINDER_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600">
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

            <div className="flex gap-2">
              <button
                onClick={editingIndex !== null ? updateTenant : addTenant}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {editingIndex !== null ? "Modifier" : "Ajouter"}
              </button>

              <button
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                Annuler
              </button>
            </div>

          </div>
        )}

        {/* LISTE */}
        <div className="mt-8 space-y-3">
          {filteredTenants.map((t, i) => {
            const isPaid = !!payments[t.id]?.is_paid;
            const dueStatus = getDueStatus(t, isPaid);

            let badgeLabel = "🟢 Payé";
            let badgeClass = "bg-green-100 text-green-700";

            if (!isPaid) {
              if (dueStatus?.type === "late") {
                badgeLabel = dueStatus.label;
                badgeClass = "bg-red-100 text-red-700";
              } else if (dueStatus?.type === "today" || dueStatus?.type === "soon") {
                badgeLabel = dueStatus.label;
                badgeClass = "bg-amber-100 text-amber-700";
              } else {
                badgeLabel = "🔴 En attente";
                badgeClass = "bg-red-100 text-red-700";
              }
            }

            return (
            <div
              key={t.id ?? t.email}
              className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-gray-500">{t.email}</p>
                {t.property_address && (
                  <p className="text-sm text-gray-400">📍 {t.property_address}</p>
                )}
              </div>

              <div className="flex items-center gap-3">

                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeClass}`}>
                  {badgeLabel}
                </span>

                <span className="font-bold">{t.rent} €</span>

                <button
                  onClick={() => startEdit(i)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  ✏️
                </button>

                <button
                  onClick={() => deleteTenant(t.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  🗑
                </button>

                <Link
                href={`/tenants/${t.id}`}
                className="text-blue-600 underline"
                >
                Voir le dossier
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