import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)

    // Chercher les propriétaires dont la connexion expire dans 15 jours
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 15)
    const expiryStart = new Date(expiryDate)
    expiryStart.setDate(expiryStart.getDate() - 1)

    // Date de connexion entre 74 et 75 jours ago = expire dans 15-16 jours
    const connectedBefore = new Date()
    connectedBefore.setDate(connectedBefore.getDate() - 74)
    const connectedAfter = new Date()
    connectedAfter.setDate(connectedAfter.getDate() - 75)

    const { data: owners } = await supabase
      .from('owner_profiles')
      .select('user_id, full_name, bridge_connected_at')
      .not('bridge_user_uuid', 'is', null)
      .not('bridge_connected_at', 'is', null)
      .lte('bridge_connected_at', connectedBefore.toISOString())
      .gte('bridge_connected_at', connectedAfter.toISOString())

    if (!owners || owners.length === 0) {
      return NextResponse.json({ message: 'Aucun rappel à envoyer' })
    }

    // Récupérer l'email de chaque proprio via auth
    const sent: any[] = []
    for (const owner of owners) {
      const { data: userData } = await supabase.auth.admin.getUserById(owner.user_id)
      const email = userData?.user?.email
      if (!email) continue

      const expiryDateStr = new Date(owner.bridge_connected_at)
      expiryDateStr.setDate(expiryDateStr.getDate() + 90)
      const dateLabel = expiryDateStr.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

      const { error } = await resend.emails.send({
        from: 'noreply@loyafr.com',
        to: email,
        subject: '⚠️ Votre connexion bancaire Loya expire dans 15 jours',
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 560px;">
            <h2 style="color: #1a1208;">Bonjour ${owner.full_name || ''} 👋</h2>
            <p>Votre connexion bancaire sur Loya <strong>expire le ${dateLabel}</strong>.</p>
            <p>Après cette date, Loya ne pourra plus détecter automatiquement vos virements de loyer ni générer vos quittances automatiquement.<p>
            Sur votre tableau de bord, cliquez sur "Déconnecter" dans la tuile Connexion bancaire, puis sur "Connecter" pour renouveler l'accès. Cela prend moins d'une minute.</p>
              <a href="https://loyafr.com/dashboard" style="display:inline-block;background:#1a1208;color:#fbf1e3;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
                Renouveler ma connexion →
              </a>
            <p>
          </div>
        `,
      })

      sent.push({ email, sent: !error, error: error?.message })
    }

    return NextResponse.json({ total: sent.length, sent })

  } catch (error: any) {
    console.error('Erreur expiry reminder:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}