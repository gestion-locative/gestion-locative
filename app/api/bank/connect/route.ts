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
    const { userId } = await req.json()

    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('bridge_user_uuid')
      .eq('user_id', userId)
      .single()

    let bridgeUserUuid = owner?.bridge_user_uuid

    if (!bridgeUserUuid) {
      const userResponse = await fetch(
        'https://api.bridgeapi.io/v3/aggregation/users',
        {
          method: 'POST',
          headers: BRIDGE_HEADERS,
          body: JSON.stringify({ external_user_id: `loya-${userId}` })
        }
      )
      const userData = await userResponse.json()

      if (userData.uuid) {
        bridgeUserUuid = userData.uuid
      } else if (userData.errors?.[0]?.code === 'users.creation.already_exists_with_external_user_id') {
        const listResponse = await fetch(
          `https://api.bridgeapi.io/v3/aggregation/users?external_user_id=loya-${userId}`,
          { headers: BRIDGE_HEADERS }
        )
        const listData = await listResponse.json()
        bridgeUserUuid = listData.resources?.[0]?.uuid
      }
    }

    if (!bridgeUserUuid) {
      return NextResponse.json({ error: 'Impossible de créer ou récupérer l\'utilisateur Bridge' }, { status: 500 })
    }

    const tokenResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/authorization/token',
      {
        method: 'POST',
        headers: BRIDGE_HEADERS,
        body: JSON.stringify({ user_uuid: bridgeUserUuid })
      }
    )
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Impossible de générer le token Bridge' }, { status: 500 })
    }

    const sessionResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/connect-sessions',
      {
        method: 'POST',
        headers: {
          ...BRIDGE_HEADERS,
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          user_email: 'proprietaire@loya.fr',
          country_code: 'FR',
          callback_url: `https://loyafr.com/dashboard?bank=pending&bridge_uuid=${bridgeUserUuid}`
        })
      }
    )
    const sessionData = await sessionResponse.json()

    return NextResponse.json({ connect_url: sessionData.url })

  } catch (error) {
    console.error('Erreur connexion bancaire:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}