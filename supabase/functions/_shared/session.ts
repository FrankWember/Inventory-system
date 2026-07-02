// Session issuance: mint an access JWT (accepted by Postgres RLS via auth.uid())
// and a rotating refresh token stored hashed in auth_sessions.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { signJwt } from './jwt.ts'
import { randomToken, sha256Hex } from './crypto.ts'

export const ACCESS_TTL_SEC = 60 * 60 // 1 hour
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface DbUser {
  id: string
  email: string
  phone: string | null
  display_name: string | null
  password_hash: string
  password_salt: string
}

// Service-role client: bypasses RLS so functions can read/write the auth tables.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export function jwtSecret(): string {
  const secret = Deno.env.get('APP_JWT_SECRET')
  if (!secret) throw new Error('APP_JWT_SECRET is not configured')
  return secret
}

// Public-safe user shape returned to the client (matches the app's AppUser).
export function publicUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      display_name: user.display_name ?? '',
      phone: user.phone ?? undefined,
      actual_email: user.email,
    },
  }
}

// Claims embedded in the access JWT. `sub`/`role`/`aud` are what PostgREST +
// RLS read; user_metadata lets the client rebuild the user without a DB call.
export function accessClaims(user: DbUser) {
  return {
    sub: user.id,
    role: 'authenticated',
    aud: 'authenticated',
    email: user.email,
    user_metadata: publicUser(user).user_metadata,
  }
}

export async function mintAccessToken(user: DbUser): Promise<string> {
  return await signJwt(accessClaims(user), jwtSecret(), ACCESS_TTL_SEC)
}

// Creates a fresh access + refresh token pair and persists the refresh hash.
export async function issueSession(admin: SupabaseClient, user: DbUser) {
  const accessToken = await mintAccessToken(user)
  const refreshToken = randomToken(32)
  const refreshHash = await sha256Hex(refreshToken)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS).toISOString()

  const { error } = await admin.from('auth_sessions').insert({
    user_id: user.id,
    refresh_token_hash: refreshHash,
    expires_at: expiresAt,
  })
  if (error) throw new Error(`Failed to persist session: ${error.message}`)

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL_SEC,
    user: publicUser(user),
  }
}
