// POST /auth-confirm-reset { token, password }
// Consumes a reset token, sets the new password, and revokes all sessions.
import { json, preflight } from '../_shared/cors.ts'
import { hashPassword, sha256Hex } from '../_shared/crypto.ts'
import { adminClient } from '../_shared/session.ts'
import { isStrongEnough } from '../_shared/validation.ts'

const INVALID = { error: { message: 'invalid_token', type: 'invalid_token' } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { token, password } = await req.json()
    if (typeof token !== 'string' || !token) return json(INVALID, 400)
    if (!isStrongEnough(password)) {
      return json({ error: { message: 'weak_password', type: 'weak_password' } }, 400)
    }

    const admin = adminClient()
    const tokenHash = await sha256Hex(token)
    const { data: row } = await admin
      .from('password_reset_tokens').select('*').eq('token_hash', tokenHash).maybeSingle()

    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      return json(INVALID, 400)
    }

    const { hash, salt } = await hashPassword(password)
    await admin.from('users')
      .update({ password_hash: hash, password_salt: salt })
      .eq('id', row.user_id)

    await admin.from('password_reset_tokens').update({ used: true }).eq('id', row.id)
    // Force re-login everywhere after a password change.
    await admin.from('auth_sessions').delete().eq('user_id', row.user_id)

    return json({ ok: true })
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
