import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function applyTemplate(template: string, vars: Record<string, string>) {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)
    const now = new Date()
    const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

    // Récupérer tous les locataires avec leur propriétaire
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: 'Aucun locataire' })
    }

    const sentEmails: any[] = []

    for (const tenant of tenants) {
      if (!tenant.email) continue

      const { data: owner } = await supabase
        .from('owner_profiles')
        .select('*')
        .eq('user_id', tenant.user_id)
        .maybeSingle()

      const subjectTemplate = owner?.rent_call_subject || 'Appel de loyer — {mois}'
      const bodyTemplate = owner?.rent_call_body ||
        `Bonjour {nom_locataire},\n\nVotre loyer de {loyer}€ pour {mois} est à régler avant le {jour_echeance} du mois.\n\n{iban_ligne}\n\nCordialement,\n{nom_proprietaire}`

      const ibanLigne = owner?.iban
        ? `Voici les coordonnées de virement : ${owner.iban}`
        : ''

      const vars = {
        nom_locataire: tenant.name,
        loyer: String(tenant.rent),
        mois: monthLabel,
        jour_echeance: String(tenant.rent_due_day || '5'),
        nom_proprietaire: owner?.full_name || 'Votre propriétaire',
        iban_ligne: ibanLigne,
      }

      const subject = applyTemplate(subjectTemplate, vars)
      const message = applyTemplate(bodyTemplate, vars)

      const { error } = await resend.emails.send({
        from: 'noreply@loyafr.com',
        to: tenant.email,
        subject,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`,
      })

      sentEmails.push({ tenant: tenant.name, sent: !error, error: error?.message })
    }

    return NextResponse.json({ total: tenants.length, sent: sentEmails })

  } catch (error: any) {
    console.error('Erreur appel de loyer:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}