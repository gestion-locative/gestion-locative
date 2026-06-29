import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    await supabase
      .from('owner_profiles')
      .update({ bridge_user_uuid: null })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}