// POST /auth-update-profile { display_name }   (Authorization: Bearer <access JWT>)
// Updates the display name and returns a fresh access token carrying the new
// metadata so the client reflects the change without re-login.
import { json, preflight } from '../_shared/cors.ts'
import { verifyJwt } from '../_shared/jwt.ts'
import {
  adminClient,
  jwtSecret,
  mintAccessToken,
  publicUser,
  ACCESS_TTL_SEC,
  type DbUser,
} from '../_shared/session.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: { message: 'method_not_allowed' } }, 405)

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    const claims = token ? await verifyJwt(token, jwtSecret()) : null
    if (!claims?.sub) return json({ error: { message: 'unauthorized' } }, 401)

    const { display_name } = await req.json()
    if (typeof display_name !== 'string') {
      return json({ error: { message: 'invalid_display_name' } }, 400)
    }

    const admin = adminClient()
    const { data: user, error } = await admin
      .from('users')
      .update({ display_name: display_name.trim() })
      .eq('id', claims.sub)
      .select('id, email, phone, display_name')
      .single()

    if (error || !user) {
      return json({ error: { message: error?.message || 'update_failed' } }, 500)
    }

    const accessToken = await mintAccessToken(user as DbUser)
    return json({
      user: publicUser(user as DbUser),
      access_token: accessToken,
      expires_in: ACCESS_TTL_SEC,
    })
  } catch (e) {
    return json({ error: { message: String((e as Error)?.message || e) } }, 500)
  }
})
