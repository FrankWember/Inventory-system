// Password hashing (PBKDF2 via Web Crypto — no external deps) and token helpers.
// Runs on the Supabase Edge runtime (Deno). All secrets stay server-side.

const ITERATIONS = 100_000
const KEY_LEN = 32 // bytes
const enc = new TextEncoder()

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    keyMaterial,
    KEY_LEN * 8,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(
  password: string,
): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const derived = await pbkdf2(password, salt)
  return { hash: toBase64(derived), salt: toBase64(salt) }
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const derived = await pbkdf2(password, fromBase64(salt))
  const expected = fromBase64(hash)
  if (derived.length !== expected.length) return false
  // Constant-time comparison.
  let diff = 0
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i]
  return diff === 0
}

// Opaque, URL-safe random token (used for refresh + password-reset tokens).
export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
