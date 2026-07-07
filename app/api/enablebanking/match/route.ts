import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionAccounts, getAccountTransactions, normalizeEnableBankingTransaction } from '@/lib/enablebanking'
// Réutilise les fonctions déjà écrites dans bank/match — à extraire dans un fichier partagé
// (lib/matching.ts) si tu veux éviter la duplication. Pour l'instant, on suppose qu'elles
// sont accessibles depuis un module commun.
import { matchTransaction, cleanSignature, findLearnedMatch, hasExistingPendingMatch, askAiForMatch, confirmPayment, generateAndSendReceipt, handleSyncError, handleSyncSuccess } from '@/lib/matching'

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

    const { data: owners } = await supabase
      .from('owner_profiles')
      .select('user_id, full_name, enablebanking_session_id')
      .not('enablebanking_session_id', 'is', null)

    if (!owners || owners.length === 0) {
      return NextResponse.json({ message: 'Aucun propriétaire avec banque Enable Banking connectée' })
    }

    const allResults: any[] = []

    for (const owner of owners) {
      try {
        const accountIds = await getSessionAccounts(owner.enablebanking_session_id)

        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name, rent')
          .eq('user_id', owner.user_id)

        if (!tenants || tenants.length === 0) continue

        let allTransactions: any[] = []
        for (const accountId of accountIds) {
          const rawTx = await getAccountTransactions(accountId)
          allTransactions.push(...rawTx.map(normalizeEnableBankingTransaction))
        }

        const results = allTransactions
        .map((transaction) => {
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
        .filter((r): r is NonNullable<typeof r> => r !== null)
    

        const confirmedPayments: any[] = []
        const pendingSuggestions: any[] = []

        for (const result of results) {
          if (result.confidence === 'high') {
            const confirmation = await confirmPayment(result.tenant.id, result.transaction.date)
            confirmedPayments.push({ tenant: result.tenant.name, ...confirmation })
            if (confirmation.payment && !confirmation.error && confirmation.action !== 'already_paid') {
              await generateAndSendReceipt(result.tenant.id, confirmation.payment.id)
            }
            continue
          }

          if (result.confidence === 'medium' || result.confidence === 'low') {
            const signature = cleanSignature(result.transaction.description)
            const learnedTenantId = await findLearnedMatch(owner.user_id, signature)

            if (learnedTenantId) {
              const confirmation = await confirmPayment(learnedTenantId, result.transaction.date)
              confirmedPayments.push({ tenant: result.tenant.name, source: 'pattern_appris', ...confirmation })
              if (confirmation.payment && !confirmation.error && confirmation.action !== 'already_paid') {
                await generateAndSendReceipt(learnedTenantId, confirmation.payment.id)
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
                  bridge_transaction_id: result.transaction.id, // même colonne réutilisée, indépendante du fournisseur
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

        const confirmedCount = confirmedPayments.filter((p) => p.action !== 'already_paid').length
        await handleSyncSuccess(owner, allTransactions.length, results.length, confirmedCount)

        allResults.push({
          owner_id: owner.user_id,
          total_transactions: allTransactions.length,
          matches_found: results.length,
          confirmed: confirmedPayments,
          pending_ai_suggestions: pendingSuggestions.length,
        })
      } catch (ownerError: any) {
        console.error(`Erreur sync Enable Banking propriétaire ${owner.user_id}:`, ownerError)
        await handleSyncError(owner, ownerError.message || 'Erreur inconnue')
      }
    }

    return NextResponse.json({ results: allResults })
  } catch (error: any) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}