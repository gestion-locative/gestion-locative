import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from "resend"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const BRIDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Bridge-Version': '2025-01-15',
  'Client-Id': process.env.BRIDGE_CLIENT_ID!,
  'Client-Secret': process.env.BRIDGE_CLIENT_SECRET!,
}

// Nombre d'échecs consécutifs avant d'alerter le propriétaire par email
const ERROR_THRESHOLD = 2
// Délai minimum entre deux emails d'alerte tant que le problème persiste (en jours)
const RENOTIFY_AFTER_DAYS = 7

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
// Vérifie le nom exact du modèle Flash gratuit actuel sur aistudio.google.com si ça échoue un jour
const GEMINI_MODEL = 'gemini-2.5-flash'
// Confiance IA à partir de laquelle on valide le paiement automatiquement
const AI_AUTO_CONFIRM_THRESHOLD = 85
// En dessous de ce seuil, on ignore complètement (pas assez fiable pour même suggérer)
const AI_SUGGEST_THRESHOLD = 40

// Nettoie un libellé bancaire pour en extraire une "signature" stable d'un mois à l'autre
// (retire les mois et les chiffres, qui changent, pour ne garder que la structure fixe)
function cleanSignature(description: string): string {
  const MONTHS = ['JANV', 'FEVR', 'FEV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC']
  let sig = (description || '').toUpperCase()
  for (const m of MONTHS) {
    sig = sig.replace(new RegExp(m, 'g'), '')
  }
  sig = sig.replace(/[0-9]/g, '')
  sig = sig.replace(/\s+/g, ' ').trim()
  return sig
}

async function findLearnedMatch(userId: string, signature: string): Promise<string | null> {
  if (!signature) return null
  const { data } = await supabase
    .from('tenant_payment_patterns')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('signature', signature)
    .maybeSingle()
  return data?.tenant_id || null
}

async function learnPattern(userId: string, tenantId: string, signature: string) {
  if (!signature) return
  await supabase
    .from('tenant_payment_patterns')
    .upsert(
      { user_id: userId, tenant_id: tenantId, signature },
      { onConflict: 'user_id,tenant_id,signature', ignoreDuplicates: true }
    )
}

async function hasExistingPendingMatch(userId: string, transactionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('pending_bank_matches')
    .select('id')
    .eq('user_id', userId)
    .eq('bridge_transaction_id', transactionId)
    .maybeSingle()
  return !!data
}

async function askAiForMatch(
  transaction: { description: string; amount: number; date: string },
  tenants: { id: string; name: string; rent: number }[]
): Promise<{ tenant_id: string | null; confidence: number; reason: string }> {
  const tenantList = tenants.map(t => `- id: ${t.id}, nom: ${t.name}, loyer: ${t.rent}€`).join('\n')

  const systemPrompt = `Tu aides à identifier quel locataire correspond à un virement bancaire pour une application de gestion locative française. Réponds uniquement avec un objet JSON au format :
{"tenant_id": "uuid-ou-null", "confidence": 0-100, "reason": "explication courte en français"}

Règles :
- "tenant_id" doit être l'id exact d'un des locataires listés, ou null si aucun ne correspond raisonnablement.
- "confidence" est ton niveau de certitude de 0 à 100.
- Prends en compte : le montant (les loyers peuvent varier légèrement : frais, arrondis), des fragments de nom dans le libellé, des références d'appartement ou d'adresse si mentionnées.
- Si plusieurs locataires sont plausibles, choisis le plus probable et baisse la confiance en conséquence plutôt que de renvoyer null.`

  const userPrompt = `Locataires possibles :\n${tenantList}\n\nVirement à identifier :\n- Libellé : "${transaction.description}"\n- Montant : ${transaction.amount}€\n- Date : ${transaction.date}`

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
          // Force une sortie JSON syntaxiquement valide, garanti par Gemini
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 500,
          },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error(`Erreur API Gemini (status ${res.status}):`, JSON.stringify(data))
      return { tenant_id: null, confidence: 0, reason: 'Erreur API IA' }
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) {
      console.error('Réponse Gemini vide ou inattendue:', JSON.stringify(data))
      return { tenant_id: null, confidence: 0, reason: 'Réponse IA vide' }
    }

    let parsed
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      console.error('Réponse Gemini non parseable — texte brut :', text.slice(0, 500))
      return { tenant_id: null, confidence: 0, reason: 'Réponse IA invalide' }
    }

    return {
      tenant_id: parsed.tenant_id || null,
      confidence: Number(parsed.confidence) || 0,
      reason: parsed.reason || '',
    }
  } catch (err: any) {
    console.error('Erreur appel IA matching (Gemini):', err.message)
    return { tenant_id: null, confidence: 0, reason: "Erreur technique lors de l'analyse IA" }
  }
}

function matchTransaction(transaction: any, tenants: any[]) {
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

async function confirmPayment(tenantId: string, transactionDate: string) {
  const month = transactionDate.substring(0, 7)

  const { data: existing } = await supabase
    .from('payments')
    .select('id, is_paid')
    .eq('tenant_id', tenantId)
    .eq('month', `${month}-01`)
    .single()

  // Si déjà payé → on ne fait rien du tout
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

async function generateAndSendReceipt(tenantId: string, paymentId: string) {
  try {
    const { data: tenant } = await supabase
      .from('tenants').select('*').eq('id', tenantId).single()

    const { data: payment } = await supabase
      .from('payments').select('*').eq('id', paymentId).single()

    const { data: owner } = await supabase
      .from('owner_profiles').select('*').eq('user_id', tenant.user_id).maybeSingle()

    if (!tenant || !payment) return { error: 'Données manquantes' }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://loyafr.com'

    const receiptRes = await fetch(`${baseUrl}/api/generate-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, paymentId })
    })

    const receiptData = await receiptRes.json()
    if (!receiptData.url) return { error: 'Quittance non générée', details: receiptData }

    const { data: receipt } = await supabase
      .from('receipts').select('id').eq('payment_id', paymentId).single()

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

async function handleSyncError(owner: any, errorMessage: string) {
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
      // On ne bloque pas le reste du cron pour ça, mais on garde une trace :
      // sans ça, un proprio pourrait ne jamais être alerté sans que personne ne le sache.
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

async function handleSyncSuccess(
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

  // Une synchro réussie efface l'historique d'erreurs : on repart de zéro
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

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: owners } = await supabase
      .from('owner_profiles')
      .select('user_id, full_name, bridge_user_uuid, bank_sync_error_count, bank_error_notified_at')
      .not('bridge_user_uuid', 'is', null)

    if (!owners || owners.length === 0) {
      return NextResponse.json({ message: 'Aucun propriétaire avec banque connectée' })
    }

    const allResults: any[] = []

    for (const owner of owners) {
      try {
        // Générer un token Bridge pour ce propriétaire
        const tokenResponse = await fetch(
          'https://api.bridgeapi.io/v3/aggregation/authorization/token',
          {
            method: 'POST',
            headers: BRIDGE_HEADERS,
            body: JSON.stringify({ user_uuid: owner.bridge_user_uuid })
          }
        )
        const tokenData = await tokenResponse.json()

        if (!tokenData.access_token) {
          await handleSyncError(owner, `Token Bridge non obtenu : ${JSON.stringify(tokenData).slice(0, 200)}`)
          continue
        }

        // Récupérer les transactions
        const transactionsResponse = await fetch(
          'https://api.bridgeapi.io/v3/aggregation/transactions',
          {
            headers: {
              ...BRIDGE_HEADERS,
              'Authorization': `Bearer ${tokenData.access_token}`,
            }
          }
        )
        const transactionsData = await transactionsResponse.json()

        if (!transactionsResponse.ok) {
          await handleSyncError(owner, `Erreur récupération transactions : ${JSON.stringify(transactionsData).slice(0, 200)}`)
          continue
        }

        const transactions = transactionsData.resources || []

        // Récupérer les locataires de ce propriétaire uniquement
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name, rent')
          .eq('user_id', owner.user_id)

        if (!tenants || tenants.length === 0) {
          await handleSyncSuccess(owner, transactions.length, 0, 0)
          continue
        }

        // Matcher
        const results = transactions
          .map((transaction: any) => {
            const match = matchTransaction(transaction, tenants)
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

        // Confirmer les paiements high confidence
        const confirmedPayments: any[] = []
        const pendingSuggestions: any[] = []

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

            if (confirmation.payment && !confirmation.error && confirmation.action !== 'already_paid') {
              const receipt = await generateAndSendReceipt(
                result.tenant.id,
                confirmation.payment.id
              )
              confirmedPayments[confirmedPayments.length - 1].receipt = receipt
            }
            continue
          }

          // Cas ambigu (medium/low) : on tente d'abord un pattern déjà appris
          // (gratuit, instantané), puis on ne sollicite l'IA qu'en dernier recours.
          if (result.confidence === 'medium' || result.confidence === 'low') {
            const signature = cleanSignature(result.transaction.description)
            const learnedTenantId = await findLearnedMatch(owner.user_id, signature)

            if (learnedTenantId) {
              const confirmation = await confirmPayment(learnedTenantId, result.transaction.date)
              confirmedPayments.push({
                tenant: result.tenant.name,
                month: result.transaction.date.substring(0, 7),
                source: 'pattern_appris',
                ...confirmation
              })
              if (confirmation.payment && !confirmation.error && confirmation.action !== 'already_paid') {
                const receipt = await generateAndSendReceipt(learnedTenantId, confirmation.payment.id)
                confirmedPayments[confirmedPayments.length - 1].receipt = receipt
              }
              continue
            }

            // Déjà vu (en attente, confirmé ou rejeté) : pas la peine de rappeler l'IA
            const alreadyTracked = await hasExistingPendingMatch(owner.user_id, result.transaction.id)
            if (alreadyTracked) continue

            const ai = await askAiForMatch(
              { description: result.transaction.description, amount: result.transaction.amount, date: result.transaction.date },
              tenants.map((t: any) => ({ id: t.id, name: t.name, rent: t.rent }))
            )

            if (ai.tenant_id && ai.confidence >= AI_AUTO_CONFIRM_THRESHOLD) {
              const confirmation = await confirmPayment(ai.tenant_id, result.transaction.date)
              const matchedTenant = tenants.find((t: any) => t.id === ai.tenant_id)
              confirmedPayments.push({
                tenant: matchedTenant?.name || ai.tenant_id,
                month: result.transaction.date.substring(0, 7),
                source: 'ia',
                ai_reason: ai.reason,
                ...confirmation
              })
              if (confirmation.payment && !confirmation.error && confirmation.action !== 'already_paid') {
                const receipt = await generateAndSendReceipt(ai.tenant_id, confirmation.payment.id)
                confirmedPayments[confirmedPayments.length - 1].receipt = receipt
                await learnPattern(owner.user_id, ai.tenant_id, signature)
              }
            } else if (ai.tenant_id && ai.confidence >= AI_SUGGEST_THRESHOLD) {
              await supabase.from('pending_bank_matches').upsert(
                {
                  user_id: owner.user_id,
                  tenant_id: ai.tenant_id,
                  bridge_transaction_id: result.transaction.id,
                  amount: result.transaction.amount,
                  transaction_date: result.transaction.date,
                  raw_description: result.transaction.description,
                  cleaned_signature: signature,
                  ai_confidence: ai.confidence,
                  ai_reason: ai.reason,
                  status: 'pending',
                },
                { onConflict: 'user_id,bridge_transaction_id', ignoreDuplicates: true }
              )
              pendingSuggestions.push({ tenant_id: ai.tenant_id, confidence: ai.confidence })
            }
            // En dessous du seuil de suggestion : on ignore, comme avant l'IA.
          }
        }

        const confirmedCount = confirmedPayments.filter(p => p.action !== 'already_paid').length

        await handleSyncSuccess(owner, transactions.length, results.length, confirmedCount)

        allResults.push({
          owner_id: owner.user_id,
          total_transactions: transactions.length,
          matches_found: results.length,
          confirmed: confirmedPayments,
          pending_ai_suggestions: pendingSuggestions.length,
        })

      } catch (ownerError: any) {
        // On isole l'erreur à ce propriétaire : les autres propriétaires
        // continuent d'être traités même si celui-ci plante.
        console.error(`Erreur sync propriétaire ${owner.user_id}:`, ownerError)
        await handleSyncError(owner, ownerError.message || 'Erreur inconnue')
      }
    }

    return NextResponse.json({ results: allResults })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
