import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  cleanSignature,
  findLearnedMatch,
  hasExistingPendingMatch,
  askAiForMatch,
  matchTransaction,
  confirmPayment,
  generateAndSendReceipt,
  handleSyncError,
  handleSyncSuccess,
} from '@/lib/matching'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRIDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Bridge-Version': '2025-01-15',
  'Client-Id': process.env.BRIDGE_CLIENT_ID!,
  'Client-Secret': process.env.BRIDGE_CLIENT_SECRET!,
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

        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name, rent')
          .eq('user_id', owner.user_id)

        if (!tenants || tenants.length === 0) {
          await handleSyncSuccess(owner, transactions.length, 0, 0)
          continue
        }

        type MatchResult = {
          transaction: { id: string; amount: number; description: string; date: string }
          tenant: any
          confidence: string
        }

        const results = transactions
          .map((transaction: any): MatchResult | null => {
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
          .filter((r: MatchResult | null): r is MatchResult => r !== null)

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

            const alreadyTracked = await hasExistingPendingMatch(owner.user_id, result.transaction.id)
            if (alreadyTracked) continue

            const ai = await askAiForMatch(
              { description: result.transaction.description, amount: result.transaction.amount, date: result.transaction.date },
              tenants.map((t: any) => ({ id: t.id, name: t.name, rent: t.rent }))
            )

            if (ai.plausible && ai.tenant_id) {
              await supabase.from('pending_bank_matches').upsert(
                {
                  user_id: owner.user_id,
                  tenant_id: ai.tenant_id,
                  bridge_transaction_id: result.transaction.id,
                  amount: result.transaction.amount,
                  transaction_date: result.transaction.date,
                  raw_description: result.transaction.description,
                  cleaned_signature: signature,
                  ai_reason: ai.reason,
                  status: 'pending',
                },
                { onConflict: 'user_id,bridge_transaction_id', ignoreDuplicates: true }
              )
              pendingSuggestions.push({ tenant_id: ai.tenant_id })
            }
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