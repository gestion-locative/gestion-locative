import { Resend } from "resend";

export async function POST(req: Request) {
    console.log("🔥 API SEND EMAIL CALLED");
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const body = await req.json();
    const { email, name, rent } = body;
    console.log("BODY RECEIVED:", body);

    const data = await resend.emails.send({
      from: "Gestion Locative <onboarding@resend.dev>",
      to: email,
      subject: "Relance de loyer",
      html: `
        <h2>Bonjour ${name}</h2>
        <p>Nous vous rappelons que votre loyer de <b>${rent}€</b> est en attente.</p>
      `,
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error });
  }
}