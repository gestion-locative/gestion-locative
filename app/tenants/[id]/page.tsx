"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const DOCUMENT_TYPES = [
  { value: "Bail", label: "📄 Bail" },
  { value: "État des lieux (entrée)", label: "🏠 État des lieux (entrée)" },
  { value: "État des lieux (sortie)", label: "🏠 État des lieux (sortie)" },
  { value: "Certificat d'assurance", label: "🛡️ Certificat d'assurance" },
  { value: "Pièce d'identité", label: "🪪 Pièce d'identité" },
  { value: "Justificatif de revenus", label: "💰 Justificatif de revenus" },
  { value: "Autre", label: "📝 Autre" },
];

export default function TenantPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [currentPayment, setCurrentPayment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Bail");

  

  useEffect(() => {
    fetchAll();
  }, [params.id]);

  async function fetchDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("tenant_id", params.id)
    .order("created_at", { ascending: false });

  if (!error) {
    setDocuments(data || []);
  } else {
    console.log("Erreur fetch documents:", error);
  }
}

async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploadingDoc(true);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const filePath = `${userId}/${params.id}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    toast.error("Impossible d'uploader le document.");
    setUploadingDoc(false);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  const { error: insertError } = await supabase
    .from("documents")
    .insert({
      tenant_id: params.id,
      user_id: userId,
      type: selectedDocType,
      name: file.name,
      file_url: publicUrlData.publicUrl,
    });

  setUploadingDoc(false);

  if (insertError) {
    toast.error("Erreur lors de l'enregistrement du document.");
  } else {
    toast.success("Document ajouté !");
    await fetchDocuments();
    // Reset l'input file
    e.target.value = "";
  }
}

async function deleteDocument(doc: any) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  // Extrait le chemin du fichier depuis l'URL publique
  const filePath = doc.file_url.split("/documents/")[1];

  await supabase.storage
    .from("documents")
    .remove([filePath]);

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", doc.id);

  if (!error) {
    toast.success("Document supprimé.");
    await fetchDocuments();
  } else {
    toast.error("Impossible de supprimer le document.");
  }
}

  async function fetchAll() {
    await fetchTenant();
    await fetchCurrentPayment();
    await fetchHistory();
    await fetchReceipts();
    await fetchDocuments(); 

  }

  async function fetchTenant() {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!error) {
      setTenant(data);
    } else {
      console.log("Erreur fetch tenant:", error);
    }
  }

  async function fetchCurrentPayment() {
    const monthKey = getCurrentMonthKey();

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("tenant_id", params.id)
      .eq("month", monthKey)
      .maybeSingle();

    if (error) {
      console.log("Erreur fetch payment:", error);
      return;
    }

    if (data) {
      setCurrentPayment(data);
    } else {
      const { data: created, error: createError } = await supabase
        .from("payments")
        .insert({
          tenant_id: params.id,
          month: monthKey,
          is_paid: false,
        })
        .select()
        .single();

      if (createError) {
        console.log("Erreur création payment:", createError);
      } else {
        setCurrentPayment(created);
        await fetchHistory();
      }
    }
  }

  async function fetchHistory() {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("tenant_id", params.id)
      .order("month", { ascending: false });

    if (!error) {
      setHistory(data || []);
    } else {
      console.log("Erreur fetch history:", error);
    }
  }

  async function fetchReceipts() {
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("tenant_id", params.id)
      .order("month", { ascending: false });

    if (!error) {
      setReceipts(data || []);
    } else {
      console.log("Erreur fetch receipts:", error);
    }
  }

  // ➜ Génère (ou régénère) la quittance pour un paiement donné
  async function generateReceipt(paymentId: string) {
    try {
      const res = await fetch("/api/generate-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: params.id, paymentId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        console.error("Erreur génération quittance:", data.error);
        return null;
      }

      await fetchReceipts();
      return data.url;
    } catch (err) {
      console.error("Erreur génération quittance:", err);
      return null;
    }
  }

  async function togglePaid() {
    setLoadingPayment(true);

    const monthKey = getCurrentMonthKey();
    const newStatus = !(currentPayment?.is_paid);

    const { data, error } = await supabase
      .from("payments")
      .upsert(
        {
          tenant_id: params.id,
          month: monthKey,
          is_paid: newStatus,
          paid_at: newStatus ? new Date().toISOString() : null,
        },
        { onConflict: "tenant_id,month" }
      )
      .select()
      .single();

    if (error) {
      setLoadingPayment(false);
      console.error("Erreur update:", error);
      toast.error("Impossible de mettre à jour le statut, veuillez réessayer.");
      return;
    }

    setCurrentPayment(data);
    await fetchHistory();

    // ➜ Génère automatiquement la quittance si on vient de marquer "payé"
    if (newStatus) {
      await generateReceipt(data.id);
    }

    setLoadingPayment(false);
  }

  async function toggleHistoryPayment(payment: any) {
    setLoadingHistoryId(payment.id);

    const newStatus = !payment.is_paid;

    const { data, error } = await supabase
      .from("payments")
      .update({
        is_paid: newStatus,
        paid_at: newStatus ? new Date().toISOString() : null,
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (error) {
      setLoadingHistoryId(null);
      console.error("Erreur update history:", error);
      toast.error("Impossible de modifier ce mois, veuillez réessayer.");
      return;
    }

    if (payment.month === getCurrentMonthKey()) {
      setCurrentPayment(data);
    }

    await fetchHistory();

    if (newStatus) {
      await generateReceipt(data.id);
    }

    setLoadingHistoryId(null);
  }

  // ➜ Envoie la quittance par email
  async function sendReceipt(receipt: any) {
    setLoadingReceiptId(receipt.id);

    try {
      const res = await fetch("/api/send-receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        email: tenant.email,
        name: tenant.name,
        pdfUrl: receipt.pdf_url,
        month: formatMonth(receipt.month),
        ownerId: tenant.user_id,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error("La quittance n'a pas pu être envoyée, veuillez réessayer.");
      } else {
        toast.success("Quittance envoyée avec succès !");
      }
    } catch (err) {
      toast.error("Erreur réseau, vérifiez votre connexion internet.");-
      console.error(err);
    } finally {
      setLoadingReceiptId(null);
    }
  }

  async function sendReminder() {
    setLoadingEmail(true);

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
        toast.error("L'email de relance n'a pas pu être envoyé, vérifiez votre connexion.");
        return;
      }

      const { data: updated, error: updateError } = await supabase
        .from("tenants")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", tenant.id)
        .select()
        .single();

      if (!updateError) {
        setTenant(updated);
      }

      toast.success("Relance envoyée avec succès !");
    } catch (err) {
      toast.error("Erreur réseau, vérifiez votre connexion internet.");
      console.error(err);
    } finally {
      setLoadingEmail(false);
    }
  }

  function getDueStatus() {
    if (!tenant.rent_due_day || currentPayment?.is_paid) return null;

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
        label: `🔴 En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? "s" : ""}`,
      };
    } else if (diffDays === 0) {
      return { type: "today", label: "⚠️ Échéance aujourd'hui" };
    } else if (diffDays <= 3) {
      return {
        type: "soon",
        label: `⚠️ Échéance dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`,
      };
    }

    return null;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const dueStatus = getDueStatus();
  const isPaidThisMonth = !!currentPayment?.is_paid;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-xl mx-auto">

        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-500 text-sm mt-1">{tenant.email}</p>
              {tenant.phone && (
                <p className="text-gray-500 text-sm mt-1">
                  📞 <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
                </p>
              )}
              {tenant.property_address && (
                <p className="text-gray-400 text-sm mt-1">📍 {tenant.property_address}</p>
              )}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPaidThisMonth
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isPaidThisMonth ? "🟢 Payé ce mois" : "🔴 En attente"}
            </span>
          </div>

          {dueStatus && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
                dueStatus.type === "late"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {dueStatus.label}
            </div>
          )}

          {tenant.auto_reminder_enabled && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
              <span className="font-medium">🔁 Relance automatique activée</span>
              {tenant.reminder_days?.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Envoi à : {tenant.reminder_days
                    .map((d: number) => (d === 0 ? "J (échéance)" : `J+${d}`))
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Loyer mensuel</span>
              <span className="text-2xl font-bold text-gray-900">{tenant.rent} €</span>
            </div>
            {tenant.rent_due_day && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 text-sm">Échéance</span>
                <span className="text-sm text-gray-700">Le {tenant.rent_due_day} du mois</span>
              </div>
            )}
            {tenant.last_reminder_sent_at && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600 text-sm">Dernière relance</span>
                <span className="text-sm text-gray-700">
                  {formatDateTime(tenant.last_reminder_sent_at)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={togglePaid}
              disabled={loadingPayment}
              className={`px-4 py-3 rounded-lg font-medium transition disabled:opacity-50 ${
                isPaidThisMonth
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {loadingPayment
                ? "Mise à jour..."
                : isPaidThisMonth
                ? "Marquer comme impayé"
                : "Marquer comme payé ce mois"}
            </button>

            <button
              onClick={sendReminder}
              disabled={loadingEmail || isPaidThisMonth}
              className="bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingEmail
                ? "Envoi en cours..."
                : isPaidThisMonth
                ? "Loyer déjà payé"
                : "Envoyer une relance"}
            </button>
          </div>

          {/* HISTORIQUE DES PAIEMENTS */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              Historique des paiements
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Cliquez sur un mois pour corriger son statut
            </p>

            {history.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun historique pour le moment.</p>
            ) : (
              <div className="space-y-1">
                {history.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleHistoryPayment(p)}
                    disabled={loadingHistoryId === p.id}
                    className="w-full flex justify-between items-center text-sm border-b border-gray-100 py-2 px-2 rounded hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <span className="text-gray-700 capitalize">{formatMonth(p.month)}</span>
                    <span
                      className={`font-medium ${
                        p.is_paid ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {loadingHistoryId === p.id
                        ? "Mise à jour..."
                        : p.is_paid
                        ? `🟢 Payé le ${formatDateTime(p.paid_at).split(" à")[0]}`
                        : "🔴 Non payé"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* HISTORIQUE DES QUITTANCES */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              📄 Quittances de loyer
            </h2>

            {receipts.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune quittance pour le moment. Elle sera générée automatiquement dès qu'un mois est marqué payé.
              </p>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center text-sm border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <span className="text-gray-700 capitalize">{formatMonth(r.month)}</span>

                    <div className="flex items-center gap-3">
                        <a
                        href={r.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                    >
                        Télécharger
                    </a>

                      <button
                        onClick={() => sendReceipt(r)}
                        disabled={loadingReceiptId === r.id}
                        className="bg-gray-800 text-white text-xs px-3 py-1 rounded hover:bg-gray-900 transition disabled:opacity-50"
                      >
                        {loadingReceiptId === r.id ? "Envoi..." : "Envoyer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DOCUMENTS */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                📁 Documents
              </h2>

              {/* Sélecteur de type + bouton upload */}
              <div className="flex flex-col gap-2 mb-4">
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="border p-2 rounded text-sm text-gray-700"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <label className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition w-fit">
                  {uploadingDoc ? "Envoi en cours..." : "📤 Ajouter un document"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDoc}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Liste des documents */}
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Aucun document pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center text-sm border border-gray-100 rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="font-medium text-gray-700">
                            {DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{doc.name}</p>
                        </div>

                        <div className="flex items-center gap-3"><a
                          
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Voir
                          </a>
                          <button
                            onClick={() => deleteDocument(doc)}
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



        </div>
      </div>
    </main>
  );
}