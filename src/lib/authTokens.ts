import AsyncStorage from '@react-native-async-storage/async-storage'

// Low-level session/token storage for our custom auth. Kept free of any
// supabase-js import so `supabase.ts` can depend on it without a cycle.

const ACCESS_KEY = '@bartrack:access_token'
const REFRESH_KEY = '@bartrack:refresh_token'
const EXPIRES_KEY = '@bartrack:token_expires_at'
const USER_KEY = '@bartrack:auth_user'

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'Configuration Supabase manquante: définissez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (fichier .env).',
  )
}

// Narrowed to string (validated above) so closures below don't re-widen them.
const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`
export const anonKey = ANON_KEY

export interface AppUser {
  id: string
  email: string
  user_metadata: {
    display_name?: string
    phone?: string
    actual_email?: string
  }
}

export interface SessionResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  user: AppUser
}

// Persist a full session (login / refresh).
export async function saveSession(session: SessionResponse): Promise<void> {
  const expiresAt = String(Date.now() + session.expires_in * 1000)
  const ops: [string, string][] = [
    [ACCESS_KEY, session.access_token],
    [EXPIRES_KEY, expiresAt],
    [USER_KEY, JSON.stringify(session.user)],
  ]
  if (session.refresh_token) ops.push([REFRESH_KEY, session.refresh_token])
  await AsyncStorage.multiSet(ops)
}

// Persist a refreshed access token + user without touching the refresh token
// (used by update-profile, which re-issues an access token in place).
export async function saveAccessToken(
  accessToken: string,
  expiresIn: number,
  user?: AppUser,
): Promise<void> {
  const ops: [string, string][] = [
    [ACCESS_KEY, accessToken],
    [EXPIRES_KEY, String(Date.now() + expiresIn * 1000)],
  ]
  if (user) ops.push([USER_KEY, JSON.stringify(user)])
  await AsyncStorage.multiSet(ops)
}

export async function getStoredUser(): Promise<AppUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY)
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, EXPIRES_KEY, USER_KEY])
}

// Single-flight guard so concurrent requests don't each rotate the refresh
// token (which would invalidate the others).
let refreshInFlight: Promise<string | null> | null = null

async function refreshSession(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${FUNCTIONS_URL}/auth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) {
      await clearSession()
      return null
    }
    const session = (await res.json()) as SessionResponse
    await saveSession(session)
    return session.access_token
  } catch {
    // Network error — keep the (stale) session so we can retry later.
    return null
  }
}

// Returns a bearer token for PostgREST. Falls back to the anon key when logged
// out or when a refresh fails, so unauthenticated requests hit the anon role
// (RLS then returns nothing) instead of sending a malformed header.
export async function getValidAccessToken(): Promise<string> {
  const [access, expiresStr] = await Promise.all([
    AsyncStorage.getItem(ACCESS_KEY),
    AsyncStorage.getItem(EXPIRES_KEY),
  ])
  if (!access) return ANON_KEY

  const expiresAt = Number(expiresStr) || 0
  // 60s skew so we refresh just before expiry.
  if (Date.now() < expiresAt - 60_000) return access

  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null
    })
  }
  const refreshed = await refreshInFlight
  return refreshed ?? ANON_KEY
}
