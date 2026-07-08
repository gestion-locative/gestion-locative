import { NextResponse } from 'next/server'
import { ENABLEBANKING_BASE_URL, enableBankingHeaders } from '@/lib/enablebanking'

export async function GET() {
  try {
    const res = await fetch(`${ENABLEBANKING_BASE_URL}/aspsps?country=FR`, {
      headers: enableBankingHeaders(),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur récupération banques' }, { status: 500 })
    }

    // On simplifie la réponse pour n'envoyer au front que ce qui est utile
    const banks = (data.aspsps || []).map((b: any) => ({
      name: b.name,
      logo: b.logo,
    }))

    return NextResponse.json({ banks })
  } catch (error: any) {
    console.error('Erreur enablebanking/banks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}