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

    // Récupérer l'uuid Bridge avant de le supprimer
    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('bridge_user_uuid')
      .eq('user_id', userId)
      .single()

    // Supprimer vraiment l'utilisateur côté Bridge
    if (owner?.bridge_user_uuid) {
      const deleteResponse = await fetch(
        `https://api.bridgeapi.io/v3/aggregation/users/${owner.bridge_user_uuid}`,
        {
          method: 'DELETE',
          headers: BRIDGE_HEADERS,
        }
      )
      console.log('Suppression Bridge:', deleteResponse.status)
    }

    // Nettoyer dans Supabase
    await supabase
      .from('owner_profiles')
      .update({ bridge_user_uuid: null, last_bank_sync_at: null })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}