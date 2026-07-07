import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const ERROR_THRESHOLD = 2
const RENOTIFY_AFTER_DAYS = 7

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_MODEL = 'gemini-2.5-flash'

export function cleanSignature(description: string): string {
  const MONTHS = ['JANV', 'FEVR', 'FEV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC']
  let sig = (description || '').toUpperCase()
  for (const m of MONTHS) {
    sig = sig.replace(new RegExp(m, 'g'), '')
  }
  sig = sig.replace(/[0-9]/g, '')
  sig = sig.replace(/\s+/g, ' ').trim()
  return sig
}

export async function findLearnedMatch(userId: string, signature: string): Promise<string | null> {
  if (!signature) return null
  const { data } = await supabase
    .from('tenant_payment_patterns')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('signature', signature)
    .maybeSingle()
  return data?.tenant_id || null
}

export async function hasExistingPendingMatch(userId: string, transactionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('pending_bank_matches')
    .select('id')
    .eq('user_id', userId)
    .eq('bridge_transaction_id', transactionId)
    .maybeSingle()
  return !!data
}

export async function askAiForMatch(
  transaction: { description: string; amount: number; date: string },
  tenants: { id: string; name: string; rent: number }[]
): Promise<{ plausible: boolean; tenant_id: string | null; reason: string }> {
  const tenantList = tenants.map(t => `- id: ${t.id}, nom: ${t.name}, loyer: ${t.rent}€`).join('\n')

  const systemPrompt = `Tu aides à filtrer les virements bancaires reçus par un propriétaire, pour une application de gestion locative française. Ta seule tâche : déterminer si un virement PEUT PLAUSIBLEMENT être le paiement d'un loyer par l'un de ses locataires, ou si c'est clairement autre chose (remboursement d'assurance, vente d'occasion, virement d'un proche, salaire, etc.).

Réponds uniquement avec un objet JSON au format :
{"plausible": true ou false, "tenant_id": "uuid-ou-null", "reason": "explication courte en français"}

Règles :
- "plausible": true si ce virement pourrait raisonnablement être un loyer d'un des locataires listés (même avec un doute), false si le libellé indique clairement autre chose (ex: "REMBOURSEMENT SECU", "VENTE VINTED", "SALAIRE", virement d'une personne manifestement non liée à la location).
- "tenant_id" : si plausible=true, indique le locataire le plus probable même si tu n'es pas certain. Ne renvoie null que si plausible=false, ou si plausible=true mais que tu ne peux vraiment pas départager entre plusieurs locataires.
- Un montant qui correspond exactement au loyer d'un locataire est presque toujours plausible=true, même si le nom dans le libellé ne correspond à personne — sauf si le libellé indique explicitement une autre nature de transaction (voir ci-dessus).
- Le but n'est pas de décider avec certitude qui a payé, juste d'écarter les virements qui n'ont manifestement rien à voir avec un loyer. Le propriétaire tranchera lui-même les cas ambigus.`

  const userPrompt = `Locataires possibles :\n${tenantList}\n\nVirement à analyser :\n- Libellé : "${transaction.description}"\n- Montant : ${transaction.amount}€\n- Date : ${transaction.date}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2000,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error(`Erreur API Gemini (status ${res.status}):`, JSON.stringify(data))
      return { plausible: false, tenant_id: null, reason: 'Erreur API IA' }
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) {
      console.error('Réponse Gemini vide ou inattendue:', JSON.stringify(data))
      return { plausible: false, tenant_id: null, reason: 'Réponse IA vide' }
    }

    let parsed
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      console.error('Réponse Gemini non parseable — texte brut :', text.slice(0, 500))
      return { plausible: false, tenant_id: null, reason: 'Réponse IA invalide' }
    }

    return {
      plausible: parsed.plausible === true,
      tenant_id: parsed.tenant_id || null,
      reason: parsed.reason || '',
    }
  } catch (err: any) {
    console.error('Erreur appel IA matching (Gemini):', err.message)
    return { plausible: false, tenant_id: null, reason: "Erreur technique lors de l'analyse IA" }
  }
}

export function matchTransaction(transaction: any, tenants: any[]) {
  const description = transaction.clean_description?.toLowerCase() || ''
  const amount = transaction.amount

  if (amount <= 0) return null

  for (const tenant of tenants) {
    const tenantName = tenant.name?.toLowerCase() || ''
    const tenantRent = tenant.rent

    const amountMatches = Math.abs(amount - tenantRent) < 1
    const nameMatches = description.includes(tenantName) ||
      tenantName.split(' ').some((word: string) =>
        word.length > 2 && description.includes(word)
      )

    if (amountMatches && nameMatches) return { tenant, confidence: 'high' }
    if (amountMatches) return { tenant, confidence: 'medium' }
    if (nameMatches) return { tenant, confidence: 'low' }
  }

  return null
}

export async function confirmPayment(tenantId: string, transactionDate: string) {
  const month = transactionDate.substring(0, 7)

  const { data: existing } = await supabase
    .from('payments')
    .select('id, is_paid')
    .eq('tenant_id', tenantId)
    .eq('month', `${month}-01`)
    .single()

  if (existing?.is_paid) {
    return { action: 'already_paid', payment: existing, error: null }
  }

  if (existing) {
    const { data, error } = await supabase
      .from('payments')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    return { action: 'updated', payment: data, error }
  }

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

export async function generateAndSendReceipt(tenantId: string, paymentId: string) {
  try {
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single()
    const { data: owner } = await supabase.from('owner_profiles').select('*').eq('user_id', tenant.user_id).maybeSingle()

    if (!tenant || !payment) return { error: 'Données manquantes' }

    const baseUrl = 'https://loyafr.com'

    const receiptRes = await fetch(`${baseUrl}/api/generate-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId }),
    })
    const receiptData = await receiptRes.json()
    if (!receiptData.url) return { error: 'Quittance non générée', details: receiptData }

    const { data: receipt } = await supabase.from('receipts').select('id').eq('payment_id', paymentId).single()

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

async function notifyBankError(userId: string, fullName: string | null, reason: string): Promise<{ sent: boolean; failReason?: string }> {
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  const email = userData?.user?.email

  if (!email) {
    return { sent: false, failReason: userError?.message || 'Aucun email associé à ce compte' }
  }

  const { error: mailError } = await resend.emails.send({
    from: 'noreply@loyafr.com',
    to: email,
    subject: '⚠️ Problème avec votre connexion bancaire Loya',
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; max-width: 560px;">
        <h2 style="color: #1a1208;">Bonjour ${fullName || ''} 👋</h2>
        <p>Loya n'arrive plus à synchroniser votre compte bancaire depuis ${ERROR_THRESHOLD} tentatives.</p>
        <p>Concrètement : vos virements de loyer ne sont plus détectés automatiquement, et aucune quittance ne sera générée automatiquement tant que la connexion n'est pas rétablie.</p>
        <p><strong>Pour corriger ça :</strong> reconnectez votre compte bancaire depuis votre tableau de bord (bouton "Déconnecter" puis "Connecter" dans la tuile bancaire).</p>
        <a href="https://loyafr.com/dashboard" style="display:inline-block;background:#1a1208;color:#fbf1e3;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">
          Reconnecter ma banque →
        </a>
      </div>
    `,
  })

  if (mailError) {
    return { sent: false, failReason: mailError.message }
  }

  return { sent: true }
}

function shouldSendErrorEmail(errorCount: number, lastNotifiedAt: string | null): boolean {
  if (errorCount < ERROR_THRESHOLD) return false
  if (!lastNotifiedAt) return true

  const daysSinceNotified = (Date.now() - new Date(lastNotifiedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceNotified >= RENOTIFY_AFTER_DAYS
}

export async function handleSyncError(owner: any, errorMessage: string) {
  const newErrorCount = (owner.bank_sync_error_count || 0) + 1

  await supabase.from('sync_logs').insert({
    user_id: owner.user_id,
    synced_at: new Date().toISOString(),
    transactions_checked: 0,
    matches_found: 0,
    payments_confirmed: 0,
    status: 'error',
    error_message: errorMessage,
  })

  const shouldNotify = shouldSendErrorEmail(newErrorCount, owner.bank_error_notified_at)

  let notifiedAt: string | null = null
  if (shouldNotify) {
    const result = await notifyBankError(owner.user_id, owner.full_name, errorMessage)
    if (result.sent) {
      notifiedAt = new Date().toISOString()
    } else {
      console.error(`Notification d'erreur bancaire échouée pour ${owner.user_id} : ${result.failReason}`)
    }
  }

  await supabase
    .from('owner_profiles')
    .update({
      bank_sync_error_count: newErrorCount,
      bank_sync_last_error_at: new Date().toISOString(),
      ...(notifiedAt ? { bank_error_notified_at: notifiedAt } : {})
    })
    .eq('user_id', owner.user_id)
}

export async function handleSyncSuccess(
  owner: any,
  transactionsChecked: number,
  matchesFound: number,
  paymentsConfirmed: number
) {
  await supabase.from('sync_logs').insert({
    user_id: owner.user_id,
    synced_at: new Date().toISOString(),
    transactions_checked: transactionsChecked,
    matches_found: matchesFound,
    payments_confirmed: paymentsConfirmed,
    status: 'success',
  })

  await supabase
    .from('owner_profiles')
    .update({
      last_bank_sync_at: new Date().toISOString(),
      bank_sync_error_count: 0,
      bank_sync_last_error_at: null,
      bank_error_notified_at: null,
    })
    .eq('user_id', owner.user_id)
}