import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY!);

    const email = body.email?.trim();
    const name = body.name;
    const rent = body.rent;

    console.log("📩 EMAIL CLEAN:", email);

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Relance de loyer",
      html: `<p>Bonjour ${name}, loyer: ${rent}€</p>`,
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