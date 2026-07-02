import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

// Délai avant de renvoyer un rappel si la situation ne s'améliore pas (en jours)
const RENOTIFY_AFTER_DAYS = 7

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

async function getOwnerEmail(userId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  return userData?.user?.email || null
}

function shouldNotify(lastNotifiedAt: string | null): boolean {
  if (!lastNotifiedAt) return true
  const daysSince = (Date.now() - new Date(lastNotifiedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= RENOTIFY_AFTER_DAYS
}

function buildRecapHtml(fullName: string | null, lateTenants: { name: string; rent: number }[]) {
  const rows = lateTenants
    .map(
      (t) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #efe3cd; color: #1a1208;">${t.name}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #efe3cd; color: #1a1208; text-align: right;">${t.rent} €</td>
        </tr>`
    )
    .join('')

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 560px;">
      <h2 style="color: #1a1208;">Bonjour ${fullName || ''} 👋</h2>
      <p>${lateTenants.length} locataire${lateTenants.length > 1 ? 's' : ''} n'${lateTenants.length > 1 ? 'ont' : 'a'} toujours pas payé leur loyer ce mois-ci :</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${rows}
      </table>
      <p>Vous pouvez relancer manuellement depuis la fiche de chaque locataire, ou vérifier si une relance automatique est déjà activée.</p>
      <a href="https://loyafr.com/dashboard" style="display:inline-block;background:#1a1208;color:#fbf1e3;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
        Voir mon tableau de bord →
      </a>
    </div>
  `
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const monthKey = getCurrentMonthKey()
  const today = new Date().getDate()

  const { data: owners, error: ownersError } = await supabase
    .from('owner_profiles')
    .select('user_id, full_name, late_tenants_notified_at')

  if (ownersError) {
    return NextResponse.json({ error: ownersError.message }, { status: 500 })
  }

  const results: any[] = []

  for (const owner of owners || []) {
    try {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, rent, rent_due_day')
        .eq('user_id', owner.user_id)
        .eq('is_archived', false)

      if (!tenants || tenants.length === 0) continue

      const { data: payments } = await supabase
        .from('payments')
        .select('tenant_id, is_paid')
        .in('tenant_id', tenants.map((t) => t.id))
        .eq('month', monthKey)

      const paidTenantIds = new Set(
        (payments || []).filter((p) => p.is_paid).map((p) => p.tenant_id)
      )

      const lateTenants = tenants.filter((t) => {
        if (!t.rent_due_day || paidTenantIds.has(t.id)) return false
        return today > Number(t.rent_due_day)
      })

      if (lateTenants.length === 0) continue

      if (!shouldNotify(owner.late_tenants_notified_at)) {
        results.push({ owner_id: owner.user_id, skipped: true, late_count: lateTenants.length })
        continue
      }

      const email = await getOwnerEmail(owner.user_id)
      if (!email) {
        console.error(`Pas d'email trouvé pour le propriétaire ${owner.user_id}`)
        results.push({ owner_id: owner.user_id, sent: false, error: 'Email introuvable' })
        continue
      }

      const { error: sendError } = await resend.emails.send({
        from: 'noreply@loyafr.com',
        to: email,
        subject: `⏰ ${lateTenants.length} locataire${lateTenants.length > 1 ? 's' : ''} en retard de paiement`,
        html: buildRecapHtml(
          owner.full_name,
          lateTenants.map((t) => ({ name: t.name, rent: t.rent }))
        ),
      })

      if (sendError) {
        console.error(`Échec envoi récap retard pour ${owner.user_id}:`, sendError.message)
        results.push({ owner_id: owner.user_id, sent: false, error: sendError.message })
        continue
      }

      await supabase
        .from('owner_profiles')
        .update({ late_tenants_notified_at: new Date().toISOString() })
        .eq('user_id', owner.user_id)

      results.push({ owner_id: owner.user_id, sent: true, late_count: lateTenants.length })

    } catch (ownerError: any) {
      // On isole l'erreur à ce propriétaire, les autres continuent d'être traités
      console.error(`Erreur récap retard pour ${owner.user_id}:`, ownerError)
      results.push({ owner_id: owner.user_id, sent: false, error: ownerError.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
