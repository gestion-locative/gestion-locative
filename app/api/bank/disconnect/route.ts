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

async function deleteBridgeUser(bridgeUserUuid: string): Promise<{ deleted: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.bridgeapi.io/v3/aggregation/users/${bridgeUserUuid}`,
      { method: 'DELETE', headers: BRIDGE_HEADERS }
    )

    // 204 = supprimé avec succès (pas de contenu retourné, donc pas de .json() ici).
    // 404 = déjà supprimé côté Bridge (par ex. suite à une tentative précédente) : on
    // considère ça comme un succès plutôt que de rester bloqué en boucle.
    if (response.status === 204 || response.status === 404) {
      return { deleted: true }
    }

    const body = await response.text()
    return { deleted: false, error: `Status ${response.status} : ${body.slice(0, 200)}` }

  } catch (err: any) {
    return { deleted: false, error: err.message }
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('bridge_user_uuid')
      .eq('user_id', userId)
      .single()

    let deletionFailed = false
    let deletionError: string | undefined

    if (owner?.bridge_user_uuid) {
      const result = await deleteBridgeUser(owner.bridge_user_uuid)
      if (!result.deleted) {
        deletionFailed = true
        deletionError = result.error
        console.error(
          `Échec suppression utilisateur Bridge ${owner.bridge_user_uuid} pour ${userId} :`,
          result.error
        )
      }
    }

    // On déconnecte toujours côté Loya, même si la suppression Bridge a échoué :
    // le proprio ne doit pas rester coincé "connecté" juste parce que Bridge a eu
    // un problème technique. Si la suppression a échoué, on garde une trace pour
    // pouvoir la relancer plus tard (cron de nettoyage à construire si besoin).
    await supabase
      .from('owner_profiles')
      .update({
        bridge_user_uuid: null,
        last_bank_sync_at: null,
        ...(deletionFailed
          ? {
              bridge_pending_deletion_uuid: owner!.bridge_user_uuid,
              bridge_deletion_last_attempt_at: new Date().toISOString(),
            }
          : {
              bridge_pending_deletion_uuid: null,
              bridge_deletion_last_attempt_at: null,
            }),
      })
      .eq('user_id', userId)

    return NextResponse.json({
      success: true,
      bridge_deleted: !deletionFailed,
      ...(deletionFailed
        ? { warning: 'Utilisateur Bridge non supprimé, une nouvelle tentative sera nécessaire', error: deletionError }
        : {}),
    })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
