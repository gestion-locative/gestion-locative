import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatMonthFr(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export async function POST(req: Request) {
  try {
    const { tenantId, paymentId } = await req.json();

    // Récupère le locataire
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return Response.json({ error: "Locataire introuvable" }, { status: 404 });
    }

    // Récupère le paiement
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return Response.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    // Récupère le profil propriétaire
    const { data: owner } = await supabaseAdmin
      .from("owner_profiles")
      .select("*")
      .eq("user_id", tenant.user_id)
      .maybeSingle();

    const ownerName = owner?.full_name || "Propriétaire";
    const ownerAddress = owner?.address || "";
    const ownerPostalCity = owner ? `${owner.postal_code} ${owner.city}` : "";
    const ownerGender = owner?.gender || "homme";
    const soussigne = ownerGender === "femme" ? "soussignée" : "soussigné";
    const signatureUrl = owner?.signature_url || null;

    // ➜ Génération du PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 780;

    page.drawText("QUITTANCE DE LOYER", {
      x: 50,
      y,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 50;
    page.drawText(`Période : ${formatMonthFr(payment.month)}`, {
      x: 50,
      y,
      size: 12,
      font: fontBold,
    });

    y -= 40;
    page.drawText("Bailleur (propriétaire)", { x: 50, y, size: 11, font: fontBold });
    y -= 18;
    page.drawText(ownerName, { x: 50, y, size: 11, font });
    if (ownerAddress) {
      y -= 16;
      page.drawText(ownerAddress, { x: 50, y, size: 11, font });
    }
    if (ownerPostalCity.trim()) {
      y -= 16;
      page.drawText(ownerPostalCity, { x: 50, y, size: 11, font });
    }

    y -= 40;
    page.drawText("Locataire", { x: 50, y, size: 11, font: fontBold });
    y -= 18;
    page.drawText(tenant.name, { x: 50, y, size: 11, font });
    if (tenant.property_address) {
      y -= 16;
      page.drawText(`Logement : ${tenant.property_address}`, { x: 50, y, size: 11, font });
    }

    y -= 50;
    page.drawText(
      `Je ${soussigne} ${ownerName}, certifie avoir reçu de ${tenant.name}`,
      { x: 50, y, size: 11, font }
    );
    y -= 18;
    page.drawText(
      `la somme de ${tenant.rent} € au titre du paiement du loyer`,
      { x: 50, y, size: 11, font }
    );
    y -= 18;
    page.drawText(
      `pour la période de ${formatMonthFr(payment.month)}.`,
      { x: 50, y, size: 11, font }
    );

    y -= 40;
    page.drawText("Cette quittance annule tous les reçus qui auraient pu être", {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;
    page.drawText("établis précédemment en cas de paiement partiel du loyer ci-dessus.", {
      x: 50,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    y -= 50;
    const paidDate = payment.paid_at
      ? new Date(payment.paid_at).toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("fr-FR");
    page.drawText(`Fait le ${paidDate}`, { x: 50, y, size: 11, font });

    y -= 50;

    // La signature doit toujours tenir dans cette boîte, quelle que soit la
    // résolution de l'image uploadée par le propriétaire (une photo prise au
    // téléphone peut être bien plus grande que l'espace restant sur la page).
    const SIGNATURE_MAX_WIDTH = 160;
    const SIGNATURE_MAX_HEIGHT = 60;

    if (signatureUrl) {
      try {
        const sigResponse = await fetch(signatureUrl);
        if (!sigResponse.ok) {
          throw new Error(`Signature inaccessible (HTTP ${sigResponse.status}) — vérifier que le bucket Storage est public`);
        }

        const contentType = sigResponse.headers.get("content-type") || "";
        const sigBytes = await sigResponse.arrayBuffer();

        // On ne fait plus confiance au nom de fichier ni au content-type —
        // les deux peuvent mentir (ex: une photo JPEG uploadée puis renommée
        // en .png). On regarde directement la signature binaire réelle du
        // fichier : un PNG commence toujours par les octets 89 50 4E 47.
        const bytes = new Uint8Array(sigBytes);
        const isPng =
          bytes.length > 4 &&
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47;

        const sigImage = isPng
          ? await pdfDoc.embedPng(sigBytes)
          : await pdfDoc.embedJpg(sigBytes);

        // On ne prend jamais un facteur fixe : on calcule le ratio qui fait
        // tenir l'image dans la boîte max, sans jamais l'agrandir au-delà
        // de sa taille d'origine (Math.min(..., 1)).
        const scale = Math.min(
          SIGNATURE_MAX_WIDTH / sigImage.width,
          SIGNATURE_MAX_HEIGHT / sigImage.height,
          1
        );
        const sigDims = sigImage.scale(scale);

        page.drawImage(sigImage, {
          x: 50,
          y: y - sigDims.height,
          width: sigDims.width,
          height: sigDims.height,
        });
      } catch (err) {
        console.error("Erreur insertion signature:", err);
        // En cas d'échec, on retombe sur le texte plutôt que de planter la génération
        page.drawText(ownerName, { x: 50, y, size: 12, font: fontBold });
      }
    } else {
      // Signature texte simple, en "italique" simulé via une police standard
      page.drawText(ownerName, { x: 50, y, size: 12, font: fontBold });
    }

    const pdfBytes = await pdfDoc.save();


    // ➜ Upload dans Supabase Storage
    const filePath = `${tenant.user_id}/${tenant.id}/${payment.month}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("receipts")
      .getPublicUrl(filePath);

    const pdfUrl = publicUrlData.publicUrl;

    // ➜ Enregistre dans la table receipts (upsert pour éviter les doublons si régénéré)
    const { data: existing } = await supabaseAdmin
      .from("receipts")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("receipts")
        .update({ pdf_url: pdfUrl })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("receipts").insert({
        tenant_id: tenant.id,
        payment_id: payment.id,
        month: payment.month,
        pdf_url: pdfUrl,
      });
    }

    return Response.json({ url: pdfUrl });
  } catch (error: any) {
    console.error("Erreur génération quittance:", error);
    return Response.json({ error: error?.message || "Erreur inconnue" }, { status: 500 });
  }
}
