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

// D'après la doc Bridge (Items statuses) :
// 0 = ok, -2/-3 = item récemment créé/mis à jour, synchro en cours (à considérer comme valide)
// Tout le reste (402, 429, 1010...) = item existant mais pas réellement connecté (mauvais identifiants,
// authentification forte non complétée, action requise côté banque, etc.)
const HEALTHY_STATUSES = [0, -2, -3]

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
    const items = itemsData.resources || []

    // On ne compte que les items dans un état sain — un item existant mais en erreur
    // (identifiants refusés, SCA non complétée, etc.) ne veut pas dire "connecté".
    const hasConnectedBank = items.some((item: any) => HEALTHY_STATUSES.includes(item.status))

    if (hasConnectedBank) {
      await supabase
        .from('owner_profiles')
        .update({
          bridge_user_uuid: bridgeUuid,
          bridge_connected_at: new Date().toISOString(),
          // Une reconnexion réussie est la preuve que le problème est résolu :
          // pas la peine d'attendre le prochain passage du cron pour effacer l'alerte.
          bank_sync_error_count: 0,
          bank_sync_last_error_at: null,
          bank_error_notified_at: null,
        })
        .eq('user_id', userId)

      return NextResponse.json({ confirmed: true })
    }

    // Un item existe mais n'est pas dans un état sain : on renvoie le détail pour
    // pouvoir afficher un message utile côté interface plutôt qu'un simple échec silencieux.
    const problematicItem = items[0]
    return NextResponse.json({
      confirmed: false,
      ...(problematicItem
        ? { reason: problematicItem.status_code_description || problematicItem.status_code_info }
        : {})
    })

  } catch (error) {
    console.error('Erreur confirmation:', error)
    return NextResponse.json({ confirmed: false }, { status: 500 })
  }
}
