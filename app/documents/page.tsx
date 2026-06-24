"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"relances" | "quittances">("relances");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
    fetchAll();
  }, []);

  async function fetchAll() {
    await fetchTenants();
    await fetchReceipts();
  }

  async function fetchTenants() {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("user_id", userData.user?.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setTenants(data || []);
      await fetchPayments(data || []);
    }
  }

  async function fetchPayments(tenantList: any[]) {
    if (tenantList.length === 0) return;

    const monthKey = getCurrentMonthKey();
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

  async function fetchReceipts() {
    const { data: userData } = await supabase.auth.getUser();

    const { data: tenantData } = await supabase
      .from("tenants")
      .select("id")
      .eq("user_id", userData.user?.id);

    if (!tenantData || tenantData.length === 0) return;

    const ids = tenantData.map((t) => t.id);

    const { data, error } = await supabase
      .from("receipts")
      .select("*, tenants(name, email, rent, user_id)")
      .in("tenant_id", ids)
      .order("month", { ascending: false });

    if (!error) setReceipts(data || []);
  }

  async function sendReminder(tenant: any) {
    setLoadingEmailId(tenant.id);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tenant.email,
          name: tenant.name,
          rent: tenant.rent,
          ownerId: tenant.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("L'email de relance n'a pas pu être envoyé.");
      } else {
        await supabase
          .from("tenants")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", tenant.id);

        toast.success(`Relance envoyée à ${tenant.name} !`);
        await fetchTenants();
      }
    } catch {
      toast.error("Erreur réseau lors de l'envoi.");
    } finally {
      setLoadingEmailId(null);
    }
  }

  async function sendAllReminders() {
    const unpaidTenants = tenants.filter((t) => !payments[t.id]?.is_paid);
    if (unpaidTenants.length === 0) {
      toast.success("Tous les loyers sont payés !");
      return;
    }

    for (const tenant of unpaidTenants) {
      await sendReminder(tenant);
    }
  }

  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);

    try {
      const res = await fetch("/api/send-receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: receipt.tenants.email,
          name: receipt.tenants.name,
          pdfUrl: receipt.pdf_url,
          month: formatMonth(receipt.month),
          ownerId: receipt.tenants.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("La quittance n'a pas pu être envoyée.");
      } else {
        toast.success("Quittance envoyée !");
      }
    } catch {
      toast.error("Erreur réseau lors de l'envoi.");
    } finally {
      setLoadingReceiptId(null);
    }
  }

  function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  function getDaysLate(tenant: any) {
    if (!tenant.rent_due_day) return 0;
    const today = new Date().getDate();
    const diff = today - Number(tenant.rent_due_day);
    return diff > 0 ? diff : 0;
  }

  async function deleteReceipt(receipt: any) {
    // Supprime le fichier dans le storage
    const filePath = receipt.pdf_url.split("/receipts/")[1];
    await supabase.storage.from("receipts").remove([filePath]);

    // Supprime la ligne dans la table
    const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receipt.id);

    if (!error) {
        toast.success("Quittance supprimée.");
        await fetchReceipts();
    } else {
        toast.error("Impossible de supprimer la quittance.");
    }
    }

  const unpaidTenants = tenants.filter((t) => !payments[t.id]?.is_paid);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 transition mb-6"
        >
          ← Accueil
        </Link>

        <h1 className="text-3xl font-bold mb-2">📋 Relances & Quittances</h1>
        <p className="text-sm text-gray-500 mb-6">Gérez vos relances et quittances en un seul endroit.</p>

        {/* ONGLETS */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("relances")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "relances"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            🔔 Relances
            {unpaidTenants.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                {unpaidTenants.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("quittances")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "quittances"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            📄 Quittances
            {receipts.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {receipts.length}
              </span>
            )}
          </button>
        </div>

        {/* SECTION RELANCES */}
        {activeTab === "relances" && (
          <div>
            {unpaidTenants.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <p className="text-green-700 font-medium">🎉 Tous les loyers sont payés ce mois-ci !</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">
                    {unpaidTenants.length} locataire{unpaidTenants.length > 1 ? "s" : ""} en attente ce mois
                  </p>
                  <button
                    onClick={sendAllReminders}
                    className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Relancer tous ({unpaidTenants.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {unpaidTenants.map((t) => {
                    const daysLate = getDaysLate(t);
                    return (
                      <div
                        key={t.id}
                        className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex justify-between items-center"
                      >
                        <div>
                            <p className="font-semibold text-gray-900">{t.name}</p>
                            <p className="text-sm text-gray-500">{t.email}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-medium text-gray-700">{t.rent} €</span>
                                {daysLate > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    Retard {daysLate}j
                                </span>
                                )}
                                {t.auto_reminder_enabled && t.reminder_days?.length > 0 ? (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    🔁 Auto : {t.reminder_days.map((d: number) => d === 0 ? "J" : `J+${d}`).join(", ")}
                                </span>
                                ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                    Pas de relance auto
                                </span>
                                )}
                            </div>
                            </div>

                        <div className="flex items-center gap-6">
                          <Link
                            href={`/tenants/${t.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Voir
                          </Link>
                          <button
                            onClick={() => sendReminder(t)}
                            disabled={loadingEmailId === t.id}
                            className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                          >
                            {loadingEmailId === t.id ? "Envoi..." : "Relancer"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION QUITTANCES */}
        {activeTab === "quittances" && (
          <div>
            {receipts.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-500">Aucune quittance générée pour le moment.</p>
                <p className="text-xs text-gray-400 mt-1">Les quittances sont générées automatiquement quand un loyer est marqué payé.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{r.tenants?.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{formatMonth(r.month)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Télécharger
                      </a>
                      <button
                        onClick={() => sendReceipt(r)}
                        disabled={loadingReceiptId === r.id}
                        className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                      >
                        {loadingReceiptId === r.id ? "Envoi..." : "Envoyer"}
                      </button>

                    <button
                        onClick={() => deleteReceipt(r)}
                        className="text-red-500 hover:underline text-xs"
                    >
                        Supprimer
                    </button>


                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}