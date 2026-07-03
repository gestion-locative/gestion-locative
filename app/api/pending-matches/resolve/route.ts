import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

async function generateAndSendReceipt(tenantId: string, paymentId: string) {
  try {
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single()
    const { data: owner } = await supabase.from('owner_profiles').select('*').eq('user_id', tenant.user_id).maybeSingle()

    if (!tenant || !payment) return { error: 'Données manquantes' }

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://loyafr.com'

    const receiptRes = await fetch(`${baseUrl}/api/generate-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId }),
    })
    const receiptData = await receiptRes.json()
    if (!receiptData.url) return { error: 'Quittance non générée', details: receiptData }

    const { data: receipt } = await supabase.from('receipts').select('id').eq('payment_id', paymentId).single()

    // La quittance PDF est toujours générée, mais l'envoi par email dépend du toggle
    // du locataire — cohérent avec le comportement du marquage manuel sur sa fiche.
    if (!tenant.auto_receipt_enabled) {
      return { pdf_url: receiptData.url, email_sent: false, skipped_reason: 'auto_receipt_disabled' }
    }

    const month = new Date(payment.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const pdfResponse = await fetch(receiptData.url)
    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    const subjectTemplate = owner?.receipt_subject || 'Quittance de loyer — {mois}'
    const bodyTemplate = owner?.receipt_body || `Bonjour {nom_locataire},\n\nVeuillez trouver ci-joint votre quittance de loyer.\n\nCordialement,\n{nom_proprietaire}`

    const subject = subjectTemplate.replace('{mois}', month)
    const message = bodyTemplate
      .replace('{nom_locataire}', tenant.name)
      .replace('{nom_proprietaire}', owner?.full_name || 'Votre propriétaire')
      .replace('{mois}', month)

    const { error: mailError } = await resend.emails.send({
      from: 'noreply@loyafr.com',
      to: tenant.email,
      subject,
      html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`,
      attachments: [{ filename: 'quittance.pdf', content: pdfBase64 }],
    })

    if (receipt) {
      await supabase.from('receipts').update({ sent_at: new Date().toISOString() }).eq('id', receipt.id)
    }

    return { pdf_url: receiptData.url, email_sent: !mailError, email_error: mailError?.message }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function POST(req: Request) {
  try {
    const { id, userId, action, tenantId } = await req.json()

    if (!id || !userId || !action) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const { data: match, error: fetchError } = await supabase
      .from('pending_bank_matches')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !match) {
      return NextResponse.json({ error: 'Suggestion introuvable' }, { status: 404 })
    }

    // Vérification légère : on s'assure que la suggestion appartient bien à celui qui agit dessus.
    if (match.user_id !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (match.status !== 'pending') {
      return NextResponse.json({ error: 'Cette suggestion a déjà été traitée' }, { status: 409 })
    }

    if (action === 'reject') {
      await supabase.from('pending_bank_matches').update({ status: 'rejected' }).eq('id', id)
      // Volontairement : on n'apprend rien ici, un rejet ne doit jamais alimenter un pattern.
      return NextResponse.json({ success: true })
    }

    if (action !== 'confirm') {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const finalTenantId = tenantId || match.tenant_id
    if (!finalTenantId) {
      return NextResponse.json({ error: 'Aucun locataire sélectionné' }, { status: 400 })
    }

    const month = match.transaction_date.substring(0, 7)

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, is_paid')
      .eq('tenant_id', finalTenantId)
      .eq('month', `${month}-01`)
      .maybeSingle()

    let payment: any = null
    if (existingPayment) {
      if (!existingPayment.is_paid) {
        const { data } = await supabase
          .from('payments')
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq('id', existingPayment.id)
          .select()
          .single()
        payment = data
      } else {
        payment = existingPayment
      }
    } else {
      const { data } = await supabase
        .from('payments')
        .insert({ tenant_id: finalTenantId, month: `${month}-01`, is_paid: true, paid_at: new Date().toISOString() })
        .select()
        .single()
      payment = data
    }

    let receiptResult = null
    if (payment) {
      receiptResult = await generateAndSendReceipt(finalTenantId, payment.id)
    }

    // On apprend le pattern seulement maintenant : une confirmation humaine explicite
    // est le seul moment où on considère l'association libellé ↔ locataire comme fiable.
    if (match.cleaned_signature) {
      await supabase.from('tenant_payment_patterns').upsert(
        { user_id: userId, tenant_id: finalTenantId, signature: match.cleaned_signature },
        { onConflict: 'user_id,tenant_id,signature', ignoreDuplicates: true }
      )
    }

    await supabase
      .from('pending_bank_matches')
      .update({ status: 'confirmed', tenant_id: finalTenantId })
      .eq('id', id)

    return NextResponse.json({ success: true, payment, receipt: receiptResult })

  } catch (error: any) {
    console.error('Erreur résolution suggestion IA:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
