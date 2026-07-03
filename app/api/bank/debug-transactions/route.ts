import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// ⚠️ Route de debug temporaire — à supprimer une fois les tests terminés.
// Protégée par CRON_SECRET pour éviter qu'elle soit appelable publiquement en attendant.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: owners } = await supabase
    .from('owner_profiles')
    .select('user_id, bridge_user_uuid')
    .not('bridge_user_uuid', 'is', null)

  if (!owners || owners.length === 0) {
    return NextResponse.json({ message: 'Aucun propriétaire avec banque connectée' })
  }

  const owner = owners[0]

  const tokenResponse = await fetch(
    'https://api.bridgeapi.io/v3/aggregation/authorization/token',
    { method: 'POST', headers: BRIDGE_HEADERS, body: JSON.stringify({ user_uuid: owner.bridge_user_uuid }) }
  )
  const tokenData = await tokenResponse.json()

  const transactionsResponse = await fetch(
    'https://api.bridgeapi.io/v3/aggregation/transactions',
    { headers: { ...BRIDGE_HEADERS, Authorization: `Bearer ${tokenData.access_token}` } }
  )
  const transactionsData = await transactionsResponse.json()

  const simplified = (transactionsData.resources || [])
    .filter((t: any) => t.amount > 0)
    .map((t: any) => ({ description: t.clean_description, amount: t.amount, date: t.date }))

  return NextResponse.json({ transactions: simplified })
}
