"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
console.log("PAGE TENANTS CHARGÉE");


export default function TenantsPage() {

    const [tenants, setTenants] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [rent, setRent] = useState("");
    const [rentDueDay, setRentDueDay] = useState("");
    
    const router = useRouter();


    // useEffect1
    useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
        if (!data.user) {
        router.push("/login");
        }
    });
    }, []);

    //useEffect2
    useEffect(() => {
    fetchTenants();
    }, []);

    //useEffect3
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

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
        console.log(error);
    } else {
        setTenants(data);
    }
    }

    // ➜ Ajouter locataire
    async function addTenant() {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("tenants").insert([
        {
        name,
        email,
        rent: rent ? Number(rent) : null,
        rent_due_day: rentDueDay ? Number(rentDueDay) : null,
        user_id: userData.user?.id,
        },
    ]);

    if (!error) {
        setName("");
        setEmail("");
        setRent("");
        fetchTenants();
        setRentDueDay("");
        setShowForm(false);
        await fetchTenants();
    } else {
        console.log(error);
    }
    }

    // ➜ Supprimer locataire
    async function deleteTenant(id: string) {
    const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", id);

    if (!error) {
        fetchTenants();
    } else {
        console.log(error);
    }
    }

    // ➜ Modifier locataire
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
        })
        .eq("id", tenant.id);

    if (!error) {
        await fetchTenants();
        resetForm();
    } else {
        console.log(error);
    }
    }

//se deconnecter
async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
}

    // ➜ Ouvrir édition
    function startEdit(index: number) {
        const tenant = tenants[index];

        setName(tenant.name);
        setEmail(tenant.email);
        setRent(tenant.rent);

        setEditingIndex(index);
        setShowForm(true);
    }

    // ➜ Reset formulaire
    function resetForm() {
        setName("");
        setEmail("");
        setRent("");
        setEditingIndex(null);
        setShowForm(false);
    }

  return (
    <main className="min-h-screen bg-gray-50 p-10">

      <div className="max-w-3xl mx-auto">

      <div className="mb-6 flex items-center justify-between">
  
    <Link
        href="/"
        className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
    >
        ← Accueil
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

            <button
              onClick={editingIndex !== null ? updateTenant : addTenant}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {editingIndex !== null ? "Modifier" : "Ajouter"}
            </button>

            

          </div>
        )}

        {/* LISTE */}
        <div className="mt-8 space-y-3">
          {tenants.map((t,i) => (
            <div
              key={t.id ?? t.email}
              className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-gray-500">{t.email}</p>
                <p className="text-sm text-gray-500">
                Loyer dû le {t.rent_due_day} de chaque mois</p>
              </div>

              <div className="flex items-center gap-3">
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

                <button
                onClick={async () => {
                    console.log("BUTTON CLICKED");

                    try {
                    const res = await fetch("/api/send-email", {
                        method: "POST",
                        headers: {
                        "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                        email: t.email,
                        name: t.name,
                        rent: t.rent,
                        }),
                    });

                    const data = await res.json();
                    console.log("API RESPONSE:", data);

                    alert("Relance envoyée !");
                    } catch (err) {
                    console.log("FETCH ERROR:", err);
                    }
                }}
                >
                Relancer
                </button>

              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}