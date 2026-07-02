// POST /auth-signup { email, password, name?, phone? }
// Creates an app user (hashed password). Does NOT auto-login — the client shows
// a success message and sends the user to sign in (matches SignUpScreen).
import { json, preflight } from '../_shared/cors.ts'
import { hashPassword } from '../_shared/crypto.ts'
import { adminClient, publicUser, type DbUser } from '../_shared/session.ts'
import { isEmail, isStrongEnough, normalizeEmail } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { email, password, name, phone } = await req.json()

    if (!isEmail(email)) {
      return json({ error: { message: 'invalid_email', type: 'invalid_email' } }, 400)
    }
    if (!isStrongEnough(password)) {
      return json({ error: { message: 'weak_password', type: 'weak_password' } }, 400)
    }

    const admin = adminClient()
    const normEmail = normalizeEmail(email)
    const normPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null

    const { data: byEmail } = await admin
      .from('users').select('id').eq('email', normEmail).maybeSingle()
    if (byEmail) {
      return json({ error: { message: 'email_exists', type: 'email_exists' } }, 409)
    }
    if (normPhone) {
      const { data: byPhone } = await admin
        .from('users').select('id').eq('phone', normPhone).maybeSingle()
      if (byPhone) {
        return json({ error: { message: 'phone_exists', type: 'phone_exists' } }, 409)
      }
    }

    const { hash, salt } = await hashPassword(password)
    const { data: user, error } = await admin
      .from('users')
      .insert({
        email: normEmail,
        phone: normPhone,
        password_hash: hash,
        password_salt: salt,
        display_name: typeof name === 'string' ? name.trim() : '',
      })
      .select('id, email, phone, display_name')
      .single()

    if (error || !user) {
      // Unique-violation race → surface as an "exists" error.
      if (error?.code === '23505') {
        return json({ error: { message: 'email_exists', type: 'email_exists' } }, 409)
      }
      return json({ error: { message: error?.message || 'signup_failed' } }, 500)
    }

    return json({ user: publicUser(user as DbUser) }, 201)
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
