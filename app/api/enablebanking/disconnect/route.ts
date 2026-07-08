import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ENABLEBANKING_BASE_URL, enableBankingHeaders } from '@/lib/enablebanking'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 })
    }

    const { data: owner } = await supabase
      .from('owner_profiles')
      .select('enablebanking_session_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (owner?.enablebanking_session_id) {
      // On révoque la session côté Enable Banking — best effort : même si ça échoue,
      // on nettoie quand même côté Loya pour ne pas bloquer l'utilisateur.
      try {
        const res = await fetch(`${ENABLEBANKING_BASE_URL}/sessions/${owner.enablebanking_session_id}`, {
          method: 'DELETE',
          headers: enableBankingHeaders(),
        })
        if (!res.ok) {
          console.error('Erreur révocation session Enable Banking:', await res.text())
        }
      } catch (revokeError) {
        console.error('Erreur réseau lors de la révocation Enable Banking:', revokeError)
      }
    }

    const { error } = await supabase
      .from('owner_profiles')
      .update({
        enablebanking_session_id: null,
        enablebanking_connected_at: null,
      })
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur enablebanking/disconnect:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}