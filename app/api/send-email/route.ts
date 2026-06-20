import { Resend } from "resend";

export async function POST(req: Request) {
    console.log("🔥 API SEND EMAIL CALLED");
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const body = await req.json();
    const { email, name, rent } = body;
    console.log("BODY RECEIVED:", body);

    const data = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Relance de loyer",
    html: `<p>Test ${name} - ${rent}</p>`,
    });

    return Response.json(data);
  } catch (error) {
  console.log("RESEND ERROR FULL:", error);
  return Response.json({ error });
}
}