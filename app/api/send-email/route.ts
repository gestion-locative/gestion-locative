import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log("🔥 BODY:", body);
    console.log("BODY:", await req.json());

    const resend = new Resend(process.env.RESEND_API_KEY!);

    const email = body.email?.trim();
    const name = body.name;
    const rent = body.rent;

    console.log("📩 EMAIL CLEAN:", email);

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Relance de loyer",
      html: `<p>Bonjour ${name}, loyer: ${rent}€</p>`,
    });

    console.log("✅ RESEND SUCCESS:", data);

    return Response.json(data);
  } catch (error: any) {
    console.log("❌ RESEND FULL ERROR:");
    console.log(JSON.stringify(error, null, 2));

    return Response.json({ error });
  }
}