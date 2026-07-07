import { NextResponse } from 'next/server'
import { ENABLEBANKING_BASE_URL, enableBankingHeaders } from '@/lib/enablebanking'

export async function POST(req: Request) {
  try {
    const { userId, aspspName, aspspCountry } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 })
    }

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 90) // aligné sur les 90 jours qu'on a déjà avec Bridge

    const response = await fetch(`${ENABLEBANKING_BASE_URL}/auth`, {
      method: 'POST',
      headers: enableBankingHeaders(),
      body: JSON.stringify({
        access: {
          valid_until: validUntil.toISOString(),
          balances: false, // on n'a pas besoin des soldes, juste des transactions
          transactions: true,
        },
        aspsp: {
          name: aspspName, // ex: "BNP Paribas"
          country: aspspCountry || 'FR',
        },
        state: userId, // on réutilise le state pour retrouver l'utilisateur au retour
        redirect_url: 'https://loyafr.com/api/enablebanking/confirm',
        psu_type: 'personal',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erreur Enable Banking /auth:', data)
      return NextResponse.json({ error: 'Erreur de connexion à Enable Banking', details: data }, { status: 500 })
    }

    return NextResponse.json({ connect_url: data.url })
  } catch (error: any) {
    console.error('Erreur enablebanking/connect:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}