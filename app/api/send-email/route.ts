import { Resend } from "resend";

export async function POST() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const data = await resend.emails.send({
      from: "Gestion Locative <onboarding@resend.dev>",
      to: "fanny.leseach@gmail.com",
      subject: "Test SaaS ✔",
      html: "<h1>Ton SaaS envoie des emails 🔥</h1>",
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error });
  }
}