import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ENABLEBANKING_BASE_URL, enableBankingHeaders } from '@/lib/enablebanking'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // c'est le userId qu'on avait passé
    const error = searchParams.get('error')

    if (error) {
      console.error('Erreur retour Enable Banking:', error, searchParams.get('error_description'))
      return NextResponse.redirect('https://loyafr.com/dashboard?bank=error')
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'code ou state manquant' }, { status: 400 })
    }

    const response = await fetch(`${ENABLEBANKING_BASE_URL}/sessions`, {
      method: 'POST',
      headers: enableBankingHeaders(),
      body: JSON.stringify({ code }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erreur Enable Banking /sessions:', data)
      return NextResponse.redirect('https://loyafr.com/dashboard?bank=error')
    }

    // On stocke la session — pour l'instant dans owner_profiles, en parallèle des colonnes Bridge
    await supabase
      .from('owner_profiles')
      .update({
        enablebanking_session_id: data.session_id,
        enablebanking_connected_at: new Date().toISOString(),
      })
      .eq('user_id', state)

    console.log('Comptes accessibles:', data.accounts.map((a: any) => ({ uid: a.uid, iban: a.account_id?.iban })))

    return NextResponse.redirect('https://loyafr.com/dashboard?bank=connected')
  } catch (error: any) {
    console.error('Erreur enablebanking/confirm:', error)
    return NextResponse.redirect('https://loyafr.com/dashboard?bank=error')
  }
}