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
    console.log('1 - userId reçu:', userId)

    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('bridge_user_uuid')
      .eq('user_id', userId)
      .single()

    console.log('2 - owner trouvé:', owner)

    let bridgeUserUuid = owner?.bridge_user_uuid

    if (!bridgeUserUuid) {
      console.log('3 - création utilisateur Bridge')
      const userResponse = await fetch(
        'https://api.bridgeapi.io/v3/aggregation/users',
        {
          method: 'POST',
          headers: BRIDGE_HEADERS,
          body: JSON.stringify({ external_user_id: `loya-${userId}` })
        }
      )
      const userData = await userResponse.json()
      console.log('4 - userData Bridge:', userData)
      bridgeUserUuid = userData.uuid

      await supabase
        .from('owner_profiles')
        .update({ bridge_user_uuid: bridgeUserUuid })
        .eq('user_id', userId)
    }

    console.log('5 - bridgeUserUuid final:', bridgeUserUuid)

    const tokenResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/authorization/token',
      {
        method: 'POST',
        headers: BRIDGE_HEADERS,
        body: JSON.stringify({ user_uuid: bridgeUserUuid })
      }
    )
    const tokenData = await tokenResponse.json()
    console.log('6 - tokenData:', tokenData)

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
          callback_url: 'https://loyafr.com/dashboard?bank=connected'
        })
      }
    )
    const sessionData = await sessionResponse.json()
    console.log('7 - sessionData:', sessionData)

    return NextResponse.json({ connect_url: sessionData.url })

  } catch (error) {
    console.error('ERREUR:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}