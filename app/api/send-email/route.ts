import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function applyTemplate(template: string, vars: Record<string, string>) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const email = body.email?.trim();
    const name = body.name;
    const rent = body.rent;
    const ownerId = body.ownerId;

    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle();

    const subjectTemplate = owner?.reminder_subject || "Rappel de paiement de loyer";
    const bodyTemplate = owner?.reminder_body || `Bonjour {nom_locataire},\n\nNous vous informons que le paiement de votre loyer de {loyer}€ est actuellement en attente. Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nPour toute question, n'hésitez pas à nous contacter.\n\nCordialement,\n{nom_proprietaire}`;

    const vars = { nom_locataire: name, loyer: String(rent), mois: "", nom_proprietaire: owner?.full_name || "" };
    const subject = applyTemplate(subjectTemplate, vars);
    const message = applyTemplate(bodyTemplate, vars);

    console.log("📩 EMAIL CLEAN:", email);

    const { data, error } = await resend.emails.send({
      from: "loyafr.com",
      to: email,
      subject,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</div>`,
    });

    if (error) {
      console.log("❌ RESEND ERROR:", error.name, error.message);
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.log("✅ RESEND SUCCESS:", data);
    return Response.json(data);

  } catch (error: any) {
    console.log("❌ CATCH ERROR:", error?.message || error);
    return Response.json({ error: error?.message || "Erreur inconnue" }, { status: 500 });
  }
}