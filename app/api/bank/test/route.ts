import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Bridge-Version': '2025-01-15',
      'Client-Id': process.env.BRIDGE_CLIENT_ID!,
      'Client-Secret': process.env.BRIDGE_CLIENT_SECRET!,
    }

    // On récupère un token pour l'utilisateur existant
    const tokenResponse = await fetch('https://api.bridgeapi.io/v3/aggregation/authorization/token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_uuid: '1af16d4a-ac92-4701-8f90-6816069d3bc6' })
    })
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Token non reçu', details: tokenData }, { status: 400 })
    }

    // On récupère les transactions
    const transactionsResponse = await fetch(
      'https://api.bridgeapi.io/v3/aggregation/transactions',
      {
        headers: {
          ...headers,
          'Authorization': `Bearer ${tokenData.access_token}`,
        }
      }
    )

    const transactionsData = await transactionsResponse.json()
    return NextResponse.json(transactionsData)

  } catch (error) {
    console.error('Erreur :', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}