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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const totalRent = tenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0);
  const paidCount = tenants.filter((t) => payments[t.id]?.is_paid).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">

          {/* INFOS DU BIEN */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property.address}</h1>
              <p className="text-gray-500 text-sm mt-1">{property.postal_code} {property.city}</p>
              <p className="text-gray-400 text-sm mt-1">
                {property.type}{property.surface ? ` · ${property.surface} m²` : ""}
              </p>
              {property.description && (
                <p className="text-gray-400 text-sm mt-1 italic">{property.description}</p>
              )}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                tenants.length === 0
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {tenants.length === 0 ? "🔴 Vacant" : `🟢 ${tenants.length} locataire${tenants.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* STATS DU BIEN */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Loyer total</p>
              <p className="text-lg font-bold text-gray-900">{totalRent} €</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Payé ce mois</p>
              <p className="text-lg font-bold text-green-600">{paidCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-lg font-bold text-red-600">{tenants.length - paidCount}</p>
            </div>
          </div>

          {/* LOCATAIRES DU BIEN */}
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            👥 Locataires
          </h2>

          {tenants.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Aucun locataire rattaché à ce bien.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {tenants.map((t) => {
                const isPaid = !!payments[t.id]?.is_paid;
                return (
                  <div
                    key={t.id}
                    className="flex justify-between items-center text-sm border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isPaid ? "🟢 Payé" : "🔴 En attente"}
                      </span>

                      <span className="font-bold text-gray-700">{t.rent} €</span>

                      <Link
                        href={`/tenants/${t.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Voir
                      </Link>

                      <button
                        onClick={() => unlinkTenant(t.id)}
                        className="text-red-500 hover:underline text-xs"
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
          <div className="pt-4 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              ➕ Rattacher un locataire
            </h2>

            {allTenants.length === 0 ? (
              <p className="text-sm text-gray-400">
                Tous vos locataires sont déjà rattachés à un bien.{" "}
                <Link href="/tenants" className="text-blue-600 hover:underline">
                  Ajouter un locataire
                </Link>
              </p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="border p-2 rounded text-sm text-gray-700 flex-1"
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
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
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