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
      address,
      postal_code: postalCode,
      city,
      type,
      surface: surface ? Number(surface) : null,
      description,
      is_vacant: true,
    }]);

    setLoading(false);

    if (!error) {
      toast.success("Bien ajouté !");
      resetForm();
      await fetchAll();
    } else {
      toast.error("Impossible d'ajouter le bien.");
    }
  }

  async function updateProperty() {
    if (!editingId) return;
    setLoading(true);

    const { error } = await supabase
      .from("properties")
      .update({
        address,
        postal_code: postalCode,
        city,
        type,
        surface: surface ? Number(surface) : null,
        description,
      })
      .eq("id", editingId);

    setLoading(false);

    if (!error) {
      toast.success("Bien modifié !");
      resetForm();
      await fetchAll();
    } else {
      toast.error("Impossible de modifier le bien.");
    }
  }

  async function deleteProperty(id: string) {
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", id);

    if (!error) {
      toast.success("Bien supprimé.");
      await fetchAll();
    } else {
      toast.error("Impossible de supprimer le bien.");
    }
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
    setEditingId(null);
    setAddress("");
    setPostalCode("");
    setCity("");
    setType("Appartement");
    setSurface("");
    setDescription("");
    setShowForm(false);
  }

  function getTenantsForProperty(propertyId: string) {
    return tenants.filter((t) => t.property_id === propertyId);
  }

  function getTotalRent(propertyId: string) {
    return getTenantsForProperty(propertyId)
      .reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
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
    <main className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-3xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition mb-6"
        >
          ← Accueil
        </Link>

        <h1 className="text-3xl font-bold mb-6">🏠 Mes biens</h1>

        <input
          className="border p-2 w-full rounded-lg mb-6 text-sm"
          placeholder="🔍 Rechercher par adresse ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* DASHBOARD */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total biens</p>
            <p className="text-2xl font-bold text-gray-900">{totalProperties}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Occupés</p>
            <p className="text-2xl font-bold text-green-600">{occupiedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Vacants</p>
            <p className="text-2xl font-bold text-red-600">{vacantCount}</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-6"
        >
          + Ajouter un bien
        </button>

        {/* FORMULAIRE */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Modifier le bien" : "Nouveau bien"}
            </h2>

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="flex gap-3 mb-2">
              <input
                className="border p-2 w-1/3 rounded"
                placeholder="Code postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              <input
                className="border p-2 w-2/3 rounded"
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <select
              className="border p-2 w-full mb-2 rounded text-gray-700"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <input
              className="border p-2 w-full mb-2 rounded"
              placeholder="Surface (m²)"
              type="number"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />

            <textarea
              className="border p-2 w-full mb-4 rounded text-sm"
              placeholder="Description (optionnel)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={editingId ? updateProperty : addProperty}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : editingId ? "Modifier" : "Ajouter"}
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* LISTE DES BIENS */}
        <div className="space-y-3">
          {filteredProperties.length === 0 ? (
            <p className="text-sm text-gray-400">
              {search ? "Aucun bien trouvé." : "Aucun bien pour le moment."}
            </p>
          ) : (
            filteredProperties.map((p) => {
              const propertyTenants = getTenantsForProperty(p.id);
              const totalRent = getTotalRent(p.id);
              const isVacant = propertyTenants.length === 0;

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{p.address}</p>
                    <p className="text-sm text-gray-500">{p.postal_code} {p.city}</p>
                    <p className="text-sm text-gray-400">{p.type}{p.surface ? ` · ${p.surface} m²` : ""}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isVacant
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isVacant ? "🔴 Vacant" : `🟢 ${propertyTenants.length} locataire${propertyTenants.length > 1 ? "s" : ""}`}
                      </span>
                      {totalRent > 0 && (
                        <p className="text-sm font-bold text-gray-700 mt-1">{totalRent} €/mois</p>
                      )}
                    </div>

                    <button
                      onClick={() => startEdit(p)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => deleteProperty(p.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      🗑
                    </button>

                    <Link
                      href={`/properties/${p.id}`}
                      className="text-blue-600 underline text-sm"
                    >
                      Voir
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