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

// Quand une variable optionnelle (comme {iban_ligne}) est remplacée par une
// chaîne vide, il reste souvent 2 sauts de ligne collés de chaque côté de
// l'endroit où elle se trouvait — ça crée un gros blanc moche dans l'email.
// On ramène toute séquence de 3+ sauts de ligne consécutifs à un simple
// saut de paragraphe, quelle que soit la variable vide en cause.
function collapseEmptyLines(text: string) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(req: Request) {
  try {
    const { email, name, rent, rentDueDay, ownerId } = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle();

    const now = new Date();
    const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const ibanLigne = owner?.iban ? `Voici les coordonnées de virement : ${owner.iban}` : "";

    const subjectTemplate = owner?.rent_call_subject || "Appel de loyer — {mois}";
    const bodyTemplate = owner?.rent_call_body || `Bonjour {nom_locataire},\n\nPetit rappel : le loyer de {loyer}€ pour {mois} est à régler avant le {jour_echeance} du mois.\n\n{iban_ligne}\n\nMerci d'avance,\n\nBien cordialement,\n{nom_proprietaire}`;

    const vars = {
      nom_locataire: name,
      loyer: String(rent),
      mois: monthLabel,
      jour_echeance: String(rentDueDay || "5"),
      iban_ligne: ibanLigne,
      nom_proprietaire: owner?.full_name || "Votre propriétaire",
    };

    const subject = applyTemplate(subjectTemplate, vars);
    const message = collapseEmptyLines(applyTemplate(bodyTemplate, vars));

    const { data, error } = await resend.emails.send({
      from: "noreply@loyafr.com",
      to: email,
      subject,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</div>`,
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);

  } catch (error: any) {
    return Response.json({ error: error?.message || "Erreur inconnue" }, { status: 500 });
  }
}
