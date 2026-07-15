const jwt = require('jsonwebtoken')
const fs = require('fs')

const APPLICATION_ID = 'f8f89dbd-12c9-4737-bfc9-fb2215a47b24'
const PRIVATE_KEY_PATH = 'C:/Users/fanny/gestion-locative/f8f89dbd-12c9-4737-bfc9-fb2215a47b24.pem'
const SESSION_ID = '17b22ef2-62cc-436d-80ba-e424a0f61ce6'

function generateJWT() {
  const now = Math.floor(Date.now() / 1000)
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8')

  return jwt.sign(
    { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 },
    privateKey,
    { algorithm: 'RS256', header: { typ: 'JWT', alg: 'RS256', kid: APPLICATION_ID } }
  )
}

async function main() {
  const token = generateJWT()
  const headers = { Authorization: `Bearer ${token}` }

  const sessionRes = await fetch(`https://api.enablebanking.com/sessions/${SESSION_ID}`, { headers })
  const sessionData = await sessionRes.json()
  console.log('--- SESSION ---')
  console.log('Nombre de comptes:', sessionData.accounts?.length)

  for (const accountId of sessionData.accounts || []) {
    const txRes = await fetch(`https://api.enablebanking.com/accounts/${accountId}/transactions`, { headers })
    const txData = await txRes.json()
    console.log(`--- TRANSACTIONS (compte ${accountId}) ---`)
    console.log(`Nombre de transactions: ${txData.transactions?.length || 0}`)
    if (txData.transactions?.length > 0) {
      console.log(JSON.stringify(txData.transactions, null, 2))
    }
  }
}

main()

main()