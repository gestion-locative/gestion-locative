import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Client Supabase avec la clé service (accès admin, pas besoin d'utilisateur connecté)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET(req: Request) {
  // Sécurité : vérifie que c'est bien Vercel Cron qui appelle, pas n'importe qui
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const monthKey = getCurrentMonthKey();
  const today = new Date().getDate();

  // Récupère tous les locataires avec relance auto activée
  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("auto_reminder_enabled", true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const tenant of tenants || []) {
    // Ne relance que si l'échéance est dépassée
    if (!tenant.rent_due_day || today < Number(tenant.rent_due_day)) {
      continue;
    }

    // Vérifie le statut de paiement du mois en cours
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("month", monthKey)
      .maybeSingle();

    if (payment?.is_paid) {
      continue; // déjà payé, on ne relance pas
    }

    // Évite de relancer plusieurs fois le même jour
    if (tenant.last_reminder_sent_at) {
      const lastSent = new Date(tenant.last_reminder_sent_at);
      const now = new Date();
      const sameDay =
        lastSent.getFullYear() === now.getFullYear() &&
        lastSent.getMonth() === now.getMonth() &&
        lastSent.getDate() === now.getDate();
      if (sameDay) continue;
    }

    // Envoi de l'email
    const { error: sendError } = await resend.emails.send({
      from: "relance@votredomaine.com",
      to: tenant.email,
      subject: "Rappel de paiement de loyer",
      html: `<p>Bonjour ${tenant.name}, votre loyer de ${tenant.rent}€ est en attente de paiement.</p>`,
    });

    if (!sendError) {
      await supabaseAdmin
        .from("tenants")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", tenant.id);

      results.push({ tenant: tenant.name, status: "sent" });
    } else {
      results.push({ tenant: tenant.name, status: "failed", error: sendError });
    }
  }

  return Response.json({ processed: results.length, results });
}