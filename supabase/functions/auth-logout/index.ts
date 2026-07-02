// POST /auth-logout { refresh_token }
// Revokes the refresh token so it can no longer be exchanged. Idempotent.
import { json, preflight } from '../_shared/cors.ts'
import { sha256Hex } from '../_shared/crypto.ts'
import { adminClient } from '../_shared/session.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const { refresh_token } = await req.json()
    if (typeof refresh_token === 'string' && refresh_token) {
      const admin = adminClient()
      const hash = await sha256Hex(refresh_token)
      await admin.from('auth_sessions').delete().eq('refresh_token_hash', hash)
    }
    return json({ ok: true })
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
