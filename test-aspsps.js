const jwt = require('jsonwebtoken')
const fs = require('fs')

const APPLICATION_ID = 'f8f89dbd-12c9-4737-bfc9-fb2215a47b24'
const PRIVATE_KEY_PATH = 'C:/Users/fanny/gestion-locative/f8f89dbd-12c9-4737-bfc9-fb2215a47b24.pem'

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
  const res = await fetch('https://api.enablebanking.com/aspsps?country=FR', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  const allNames = data.aspsps.map(b => b.name)
  console.log('Nombre total de banques FR:', allNames.length)
  console.log('--- Toutes les banques ---')
  console.log(allNames.join('\n'))
}

main()