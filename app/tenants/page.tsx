"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
console.log("PAGE TENANTS CHARGÉE");


export default function TenantsPage() {

    const [tenants, setTenants] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [rent, setRent] = useState("");
    

    useEffect(() => {
    fetchTenants();
    }, []);

    async function fetchTenants() {
    const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

        console.log("DATA:", data);
        
    if (error) {
        console.log(error);
    } else {
        setTenants(data);
    }
    }

    // ➜ Ajouter locataire
    async function addTenant() {
    const { error } = await supabase.from("tenants").insert([
        {
        name,
        email,
        rent,
        },
    ]);

    if (!error) {
        setName("");
        setEmail("");
        setRent("");
        fetchTenants();
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
      rent,
    })
    .eq("id", tenant.id);

  if (!error) {
    resetForm();
    fetchTenants(); // reload depuis Supabase
  } else {
    console.log(error);
  }
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

      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition"
        >
          ← Accueil
        </Link>
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
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}