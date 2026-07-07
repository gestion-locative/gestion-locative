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