import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    console.log("API CALLED");

    const body = await req.json();
    console.log("BODY:", body);

    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      console.log("NO API KEY");
      return Response.json({ error: "Missing API key" });
    }

    const { email, name, rent } = body;

    if (!email) {
      return Response.json({ error: "Missing email" });
    }

    const data = await resend.emails.send({
      from: "Gestion Locative <onboarding@resend.dev>",
      to: email,
      subject: "Relance de loyer",
      html: `
        <h2>Bonjour ${name}</h2>
        <p>Loyer : ${rent}€</p>
      `,
    });

    return Response.json(data);
  } catch (error) {
    console.log("ERROR API:", error);
    return Response.json({ error });
  }
}