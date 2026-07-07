import jwt from 'jsonwebtoken'
import fs from 'fs'

const APPLICATION_ID = process.env.ENABLEBANKING_APPLICATION_ID!
const PRIVATE_KEY_PATH = process.env.ENABLEBANKING_PRIVATE_KEY_PATH // pour tester en local
const PRIVATE_KEY_ENV = process.env.ENABLEBANKING_PRIVATE_KEY // pour Vercel (contenu direct)

function getPrivateKey(): string {
  if (PRIVATE_KEY_ENV) {
    // Sur Vercel, les retours à la ligne des env vars sont souvent échappés en \n littéral
    const key = PRIVATE_KEY_ENV.replace(/\\n/g, '\n')
    console.log('Longueur de la clé (env):', key.length)
    console.log('Commence par:', key.substring(0, 30))
    console.log('Finit par:', key.substring(key.length - 30))
    return key
  }
  if (PRIVATE_KEY_PATH) {
    const key = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8')
    console.log('Longueur de la clé (fichier):', key.length)
    return key
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