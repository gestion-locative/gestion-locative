import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from "resend"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function matchTransaction(transaction: any, tenants: any[]) {
  const description = transaction.clean_description?.toLowerCase() || ''
  const amount = transaction.amount

  // On ne traite que les virements entrants (montant positif)
  if (amount <= 0) return null

  for (const tenant of tenants) {
    const tenantName = tenant.name?.toLowerCase() || ''
    const tenantRent = tenant.rent

    const amountMatches = Math.abs(amount - tenantRent) < 1 // tolérance 1€
    const nameMatches = description.includes(tenantName) ||
      tenantName.split(' ').some((word: string) => 
        word.length > 2 && description.includes(word)
      )

    if (amountMatches && nameMatches) {
      return { tenant, confidence: 'high' }
    }
    if (amountMatches) {
      return { tenant, confidence: 'medium' }
    }
    if (nameMatches) {
      return { tenant, confidence: 'low' }
    }
  }

  return null
}


async function confirmPayment(tenantId: string, transactionDate: string) {
  // Formater le mois au format YYYY-MM
  const month = transactionDate.substring(0, 7)

  // Vérifier si le paiement existe déjà pour ce mois
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('month', `${month}-01`)
    .single()

  if (existing) {
    // Mettre à jour si déjà existant
    const { data, error } = await supabase
      .from('payments')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    return { action: 'updated', payment: data, error }
  }

  // Créer une nouvelle ligne
  const { data, error } = await supabase
    .from('payments')
    .insert({
      tenant_id: tenantId,
      month: `${month}-01`,
      is_paid: true,
      paid_at: new Date().toISOString(),
    })
    .select()
    .single()

  return { action: 'created', payment: data, error }
}

/*async function generateAndSendReceipt(tenantId: string, paymentId: string) {
  // Générer la quittance PDF
  const receiptResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/generate-receipt`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId })
    }
  )
  const receiptData = await receiptResponse.json()

  if (!receiptData.url) {
    return { error: 'Quittance non générée', details: receiptData }
  }

  // Envoyer la quittance par email
  const mailResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/send-receipt-mail`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId })
    }
  )
  const mailData = await mailResponse.json()

  return { pdf_url: receiptData.url, mail: mailData }
}*/

async function generateAndSendReceipt(tenantId: string, paymentId: string) {
  try {
    // Récupérer toutes les données nécessaires
    const { data: tenant } = await supabase
      .from('tenants').select('*').eq('id', tenantId).single()
    
    const { data: payment } = await supabase
      .from('payments').select('*').eq('id', paymentId).single()

    const { data: owner } = await supabase
      .from('owner_profiles').select('*').eq('user_id', tenant.user_id).maybeSingle()

    if (!tenant || !payment) return { error: 'Données manquantes' }

    // Générer la quittance via l'API interne
    const baseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'https://loyafr.com'

    // Appel direct à generate-receipt avec le bon base URL
    const receiptRes = await fetch(`${baseUrl}/api/generate-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId })
    })

    const receiptData = await receiptRes.json()
    if (!receiptData.url) return { error: 'Quittance non générée', details: receiptData }

    // Récupérer la quittance créée pour avoir son ID
    const { data: receipt } = await supabase
      .from('receipts').select('id').eq('payment_id', paymentId).single()

    // Envoyer l'email directement
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const month = new Date(payment.month).toLocaleDateString('fr-FR', {
      month: 'long', year: 'numeric'
    })

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
      attachments: [{ filename: 'quittance.pdf', content: pdfBase64 }]
    })

    if (receipt) {
      await supabase.from('receipts')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', receipt.id)
    }

    return { 
      pdf_url: receiptData.url, 
      email_sent: !mailError,
      email_error: mailError?.message 
    }

  } catch (error: any) {
    return { error: error.message }
  }
}

export async function GET() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Bridge-Version': '2025-01-15',
      'Client-Id': process.env.BRIDGE_CLIENT_ID!,
      'Client-Secret': process.env.BRIDGE_CLIENT_SECRET!,
    }

    // Récupérer le token Bridge
    const tokenResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/authorization/token',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_uuid: '1af16d4a-ac92-4701-8f90-6816069d3bc6' })
      }
    )
    const tokenData = await tokenResponse.json()

    // Récupérer les transactions Bridge
    const transactionsResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/transactions',
      {
        headers: {
          ...headers,
          'Authorization': `Bearer ${tokenData.access_token}`,
        }
      }
    )
    const transactionsData = await transactionsResponse.json()
    const transactions = transactionsData.resources || []

    // Transaction de test simulant un vrai loyer
    const fakeTransaction = {
    id: 999999,
    clean_description: 'Virement Fanny Seach loyer',
    amount: 54,
    date: '2026-06-01',
    }
    transactions.push(fakeTransaction)


    // Récupérer les locataires Supabase
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, rent')

    if (error) {
      return NextResponse.json({ error: 'Erreur Supabase' }, { status: 500 })
    }

    // Matcher chaque transaction avec un locataire
    const results = transactions
      .map((transaction: any) => {
        const match = matchTransaction(transaction, tenants || [])
        if (!match) return null
        return {
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            description: transaction.clean_description,
            date: transaction.date,
          },
          tenant: match.tenant,
          confidence: match.confidence,
        }
      })
      .filter(Boolean)

    // Pour chaque match high → confirmer le paiement automatiquement
    const confirmedPayments: any[] = []
    for (const result of results) {
    if (result.confidence === 'high') {
        const confirmation = await confirmPayment(
        result.tenant.id,
        result.transaction.date
        )
        confirmedPayments.push({
        tenant: result.tenant.name,
        month: result.transaction.date.substring(0, 7),
        ...confirmation
        })

        if (confirmation.payment && !confirmation.error) {
        const receipt = await generateAndSendReceipt(
            result.tenant.id,
            confirmation.payment.id
        )
        confirmedPayments[confirmedPayments.length - 1].receipt = receipt
        }
    }
    }

    return NextResponse.json({
      total_transactions: transactions.length,
      matches_found: results.length,
      matches: results,
      auto_confirmed: confirmedPayments
    })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}