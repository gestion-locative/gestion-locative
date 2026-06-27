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
    const { email, name, pdfUrl, month, ownerId, receiptId } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY!);

    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle();

    const subjectTemplate = owner?.receipt_subject || "Quittance de loyer — {mois}";
    const bodyTemplate = owner?.receipt_body || `Bonjour {nom_locataire},\n\nNous vous remercions pour le règlement de votre loyer. Vous trouverez ci-joint votre quittance de loyer pour la période concernée.\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n{nom_proprietaire}`;

    const vars = { nom_locataire: name, loyer: "", mois: month, nom_proprietaire: owner?.full_name || "" };
    const subject = applyTemplate(subjectTemplate, vars);
    const message = applyTemplate(bodyTemplate, vars);

    const pdfResponse = await fetch(pdfUrl);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const { data, error } = await resend.emails.send({
      from: "loyafr.com",
      to: email,
      subject,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</div>`,
      attachments: [
        {
          filename: "quittance.pdf",
          content: pdfBase64,
        },
      ],
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Mettre à jour sent_at si on a un receiptId
    if (receiptId) {
      await supabaseAdmin
        .from("receipts")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", receiptId);
    }

    return Response.json(data);
  } catch (error: any) {
    console.error("Erreur envoi quittance:", error);
    return Response.json({ error: error?.message || "Erreur inconnue" }, { status: 500 });
  }
}
