const SECRET_KEY = process.env.ADMIN_SESSION_SECRET!

async function getKey(): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(SECRET_KEY)
  return crypto.subtle.importKey(
    'raw',
    encoded,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signAdminToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })
  const key = await getKey()
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )
  const sigBytes = Array.from(new Uint8Array(sig))
  return (
    Buffer.from(payload).toString('base64') +
    '.' +
    Buffer.from(sigBytes).toString('base64')
  )
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return false

    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8')
    const sig = Buffer.from(sigB64, 'base64')

    const key = await getKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(payload)
    )
    if (!valid) return false

    const { exp } = JSON.parse(payload)
    return Date.now() < exp
  } catch {
    return false
  }
}
