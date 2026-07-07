const jwt = require('jsonwebtoken')
const fs = require('fs')

const APPLICATION_ID = 'f8f89dbd-12c9-4737-bfc9-fb2215a47b24'
const PRIVATE_KEY_PATH = 'C:/Users/fanny/gestion-locative/f8f89dbd-12c9-4737-bfc9-fb2215a47b24.pem'
const SESSION_ID = '74514c8f-8541-45db-9bcc-36c15547f285'

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

  // 1. Récupérer les comptes liés à la session
  const sessionRes = await fetch(`https://api.enablebanking.com/sessions/${SESSION_ID}`, { headers })
  const sessionData = await sessionRes.json()
  console.log('--- SESSION ---')
  console.log(JSON.stringify(sessionData, null, 2))

  const accountId = sessionData.accounts?.[0]?.uid
  if (!accountId) {
    console.log('Aucun compte trouvé dans la session')
    return
  }

  // 2. Récupérer les transactions de ce compte
  const txRes = await fetch(`https://api.enablebanking.com/accounts/${accountId}/transactions`, { headers })
  const txData = await txRes.json()
  console.log('--- TRANSACTIONS ---')
  console.log(JSON.stringify(txData, null, 2))
}

main()