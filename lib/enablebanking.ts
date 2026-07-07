import jwt from 'jsonwebtoken'
import fs from 'fs'

const APPLICATION_ID = process.env.ENABLEBANKING_APPLICATION_ID!
const PRIVATE_KEY_PATH = process.env.ENABLEBANKING_PRIVATE_KEY_PATH // pour tester en local
const PRIVATE_KEY_ENV = process.env.ENABLEBANKING_PRIVATE_KEY // pour Vercel (contenu direct)

function getPrivateKey(): string {
  if (PRIVATE_KEY_ENV) {
    let key = PRIVATE_KEY_ENV.replace(/\\n/g, '\n').trim()

    // Si les balises PEM sont manquantes, on les ajoute
    if (!key.includes('-----BEGIN')) {
      key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`
    }

    return key
  }
  if (PRIVATE_KEY_PATH) {
    return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8')
  }
  throw new Error('Clé privée Enable Banking manquante (ENABLEBANKING_PRIVATE_KEY ou _PATH)')
}

export function generateEnableBankingJWT(): string {
  const now = Math.floor(Date.now() / 1000)
  const privateKey = getPrivateKey()

  return jwt.sign(
    {
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: now,
      exp: now + 3600, // 1h de validité, largement dans la limite de 24h max
    },
    privateKey,
    {
      algorithm: 'RS256',
      header: {
        typ: 'JWT',
        alg: 'RS256',
        kid: APPLICATION_ID,
      } as any,
    }
  )
}

export const ENABLEBANKING_BASE_URL = 'https://api.enablebanking.com'

export function enableBankingHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${generateEnableBankingJWT()}`,
  }
}

export async function getSessionAccounts(sessionId: string): Promise<string[]> {
  const res = await fetch(`${ENABLEBANKING_BASE_URL}/sessions/${sessionId}`, {
    headers: enableBankingHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Erreur session Enable Banking: ${JSON.stringify(data)}`)
  return data.accounts || []
}

export async function getAccountTransactions(accountId: string): Promise<any[]> {
  const res = await fetch(`${ENABLEBANKING_BASE_URL}/accounts/${accountId}/transactions`, {
    headers: enableBankingHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Erreur transactions Enable Banking: ${JSON.stringify(data)}`)
  return data.transactions || []
}

// Convertit une transaction Enable Banking dans le même format que celui
// attendu par matchTransaction() et cleanSignature(), pour réutiliser
// la logique de matching existante sans la réécrire.
export function normalizeEnableBankingTransaction(tx: any) {
  const amount = parseFloat(tx.transaction_amount?.amount || '0')
  const isCredit = tx.credit_debit_indicator === 'CRDT'
  const debtorName = tx.debtor?.name || ''
  const remittance = (tx.remittance_information || []).join(' ')
  // On combine le nom du débiteur (structuré) et le libellé libre dans une
  // seule chaîne, pour rester compatible avec la logique existante qui
  // cherche le nom du locataire dans une description textuelle.
  const description = `${debtorName} ${remittance}`.trim()
  const date = tx.booking_date || tx.value_date || tx.transaction_date

  return {
    id: tx.entry_reference || tx.transaction_id || `${date}-${amount}-${debtorName}`,
    amount: isCredit ? amount : -amount, // les débits deviennent négatifs, comme le filtre `amount <= 0` l'attend déjà
    clean_description: description,
    date,
  }
}