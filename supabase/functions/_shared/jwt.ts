// Minimal HS256 JWT sign/verify using Web Crypto. Tokens are signed with the
// project's JWT secret so Postgres/PostgREST accept them and auth.uid() works.

const enc = new TextEncoder()

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? enc.encode(data) : data
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToString(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return new Uint8Array(sig)
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const encHeader = b64url(JSON.stringify(header))
  const encBody = b64url(JSON.stringify(body))
  const sig = b64url(await hmac(secret, `${encHeader}.${encBody}`))
  return `${encHeader}.${encBody}.${sig}`
}

// Verifies signature + expiry. Returns the claims, or null if invalid/expired.
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<Record<string, any> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const expected = b64url(await hmac(secret, `${h}.${p}`))
  // Length-safe comparison.
  if (expected.length !== s.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ s.charCodeAt(i)
  }
  if (diff !== 0) return null
  try {
    const payload = JSON.parse(b64urlToString(p))
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
