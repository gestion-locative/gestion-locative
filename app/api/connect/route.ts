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

    // Vérifier si le proprio a déjà un uuid Bridge
    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('bridge_user_uuid')
      .eq('user_id', userId)
      .single()

    let bridgeUserUuid = owner?.bridge_user_uuid

    // Si pas encore de compte Bridge → en créer un
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
      bridgeUserUuid = userData.uuid

      // Sauvegarder dans owner_profiles
      await supabase
        .from('owner_profiles')
        .update({ bridge_user_uuid: bridgeUserUuid })
        .eq('user_id', userId)
    }

    // Générer un token d'accès
    const tokenResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/authorization/token',
      {
        method: 'POST',
        headers: BRIDGE_HEADERS,
        body: JSON.stringify({ user_uuid: bridgeUserUuid })
      }
    )
    const tokenData = await tokenResponse.json()

    // Générer l'URL de connexion bancaire
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

    return NextResponse.json({ connect_url: sessionData.url })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}