// POST /auth-login { email?, phone?, password }
// Verifies the password and returns { access_token, refresh_token, expires_in, user }.
import { json, preflight } from '../_shared/cors.ts'
import { verifyPassword } from '../_shared/crypto.ts'
import { adminClient, issueSession, type DbUser } from '../_shared/session.ts'
import { normalizeEmail } from '../_shared/validation.ts'

const INVALID = { error: { message: 'invalid_credentials', type: 'invalid_credentials' } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { email, phone, password } = await req.json()
    if (typeof password !== 'string' || !password) return json(INVALID, 401)

    const admin = adminClient()
    let query = admin.from('users').select('*')
    if (typeof phone === 'string' && phone.trim()) {
      query = query.eq('phone', phone.trim())
    } else if (typeof email === 'string' && email.trim()) {
      query = query.eq('email', normalizeEmail(email))
    } else {
      return json(INVALID, 401)
    }

    const { data: user } = await query.maybeSingle()
    if (!user) return json(INVALID, 401)

    const ok = await verifyPassword(
      password,
      (user as DbUser).password_hash,
      (user as DbUser).password_salt,
    )
    if (!ok) return json(INVALID, 401)

    const session = await issueSession(admin, user as DbUser)
    return json(session, 200)
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
