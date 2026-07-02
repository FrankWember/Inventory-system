// Client for the custom-auth Edge Functions. Talks to the functions over HTTPS
// and keeps token storage (authTokens) in sync. Screens use AuthContext, which
// wraps this — they should not import authClient directly.
import {
  FUNCTIONS_URL,
  anonKey,
  clearSession,
  getRefreshToken,
  getStoredUser,
  getValidAccessToken,
  saveAccessToken,
  saveSession,
  type AppUser,
  type SessionResponse,
} from './authTokens'

export interface AuthErrorShape {
  message: string
  type?: string
}

interface FnResult {
  ok: boolean
  status: number
  data: any
}

async function callFn(name: string, body: unknown, bearer?: string): Promise<FnResult> {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${bearer || anonKey}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { error: { message: String((e as Error)?.message || e), type: 'network_error' } },
    }
  }
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
  phone?: string,
): Promise<{ error: AuthErrorShape | null }> {
  const { ok, data } = await callFn('auth-signup', { email, password, name, phone })
  if (!ok) return { error: data.error ?? { message: 'signup_failed' } }
  return { error: null }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: AppUser | null; error: AuthErrorShape | null }> {
  const { ok, data } = await callFn('auth-login', { email, password })
  if (!ok) return { user: null, error: data.error ?? { message: 'invalid_credentials', type: 'invalid_credentials' } }
  await saveSession(data as SessionResponse)
  return { user: data.user, error: null }
}

export async function signInWithPhone(
  phone: string,
  password: string,
): Promise<{ user: AppUser | null; error: AuthErrorShape | null }> {
  const { ok, data } = await callFn('auth-login', { phone, password })
  if (!ok) return { user: null, error: data.error ?? { message: 'invalid_credentials', type: 'invalid_credentials' } }
  await saveSession(data as SessionResponse)
  return { user: data.user, error: null }
}

export async function signOut(): Promise<void> {
  const refreshToken = await getRefreshToken()
  if (refreshToken) await callFn('auth-logout', { refresh_token: refreshToken })
  await clearSession()
}

export async function updateProfile(
  displayName: string,
): Promise<{ user: AppUser | null; error: AuthErrorShape | null }> {
  const token = await getValidAccessToken()
  const { ok, data } = await callFn('auth-update-profile', { display_name: displayName }, token)
  if (!ok) return { user: null, error: data.error ?? { message: 'update_failed' } }
  if (data.access_token) {
    await saveAccessToken(data.access_token, data.expires_in ?? 3600, data.user)
  }
  return { user: data.user, error: null }
}

export async function requestPasswordReset(
  email: string,
): Promise<{ error: AuthErrorShape | null }> {
  await callFn('auth-request-reset', { email })
  // Response is intentionally uniform; never leak whether the email exists.
  return { error: null }
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<{ error: AuthErrorShape | null }> {
  const { ok, data } = await callFn('auth-confirm-reset', { token, password })
  if (!ok) return { error: data.error ?? { message: 'invalid_token', type: 'invalid_token' } }
  return { error: null }
}

// On app start: return the stored user if we still have a usable token.
export async function restoreSession(): Promise<AppUser | null> {
  const user = await getStoredUser()
  if (!user) return null
  const token = await getValidAccessToken()
  if (token === anonKey) {
    // Token expired and refresh failed → not a valid session.
    await clearSession()
    return null
  }
  return user
}

// Current signed-in user from storage (replaces supabase.auth.getUser()).
export async function getCurrentUser(): Promise<AppUser | null> {
  return getStoredUser()
}
