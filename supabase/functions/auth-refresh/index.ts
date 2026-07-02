// POST /auth-refresh { refresh_token }
// Rotates the refresh token and returns a fresh session. Old token is deleted.
import { json, preflight } from '../_shared/cors.ts'
import { sha256Hex } from '../_shared/crypto.ts'
import { adminClient, issueSession, type DbUser } from '../_shared/session.ts'

const INVALID = { error: { message: 'invalid_refresh', type: 'invalid_refresh' } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { refresh_token } = await req.json()
    if (typeof refresh_token !== 'string' || !refresh_token) return json(INVALID, 401)

    const admin = adminClient()
    const hash = await sha256Hex(refresh_token)

    const { data: sess } = await admin
      .from('auth_sessions').select('*').eq('refresh_token_hash', hash).maybeSingle()
    if (!sess || new Date(sess.expires_at).getTime() < Date.now()) {
      if (sess) await admin.from('auth_sessions').delete().eq('id', sess.id)
      return json(INVALID, 401)
    }

    const { data: user } = await admin
      .from('users').select('*').eq('id', sess.user_id).maybeSingle()
    if (!user) {
      await admin.from('auth_sessions').delete().eq('id', sess.id)
      return json(INVALID, 401)
    }

    // Rotate: drop the used refresh token before issuing a new one.
    await admin.from('auth_sessions').delete().eq('id', sess.id)
    const session = await issueSession(admin, user as DbUser)
    return json(session, 200)
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
