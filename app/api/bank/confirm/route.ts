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

export async function POST(req: Request) {
  try {
    const { userId, bridgeUuid } = await req.json()

    const tokenResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/authorization/token',
      {
        method: 'POST',
        headers: BRIDGE_HEADERS,
        body: JSON.stringify({ user_uuid: bridgeUuid })
      }
    )
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json({ confirmed: false })
    }

    const itemsResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/items',
      {
        headers: {
          ...BRIDGE_HEADERS,
          'Authorization': `Bearer ${tokenData.access_token}`,
        }
      }
    )
    const itemsData = await itemsResponse.json()
    const hasConnectedBank = (itemsData.resources || []).length > 0

    if (hasConnectedBank) {
      await supabase
    .from('owner_profiles')
    .update({ 
        bridge_user_uuid: bridgeUuid,
        bridge_connected_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    }

    return NextResponse.json({ confirmed: hasConnectedBank })

  } catch (error) {
    console.error('Erreur confirmation:', error)
    return NextResponse.json({ confirmed: false }, { status: 500 })
  }
}