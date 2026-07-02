import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import * as authClient from '../lib/authClient'
import type { AppUser } from '../lib/authTokens'
import { t } from '../i18n'

// Backwards-compatible session shape (screens only ever read `user`).
export interface AppSession {
  user: AppUser
}

interface AuthError {
  message: string
  type?:
    | 'invalid_credentials'
    | 'user_not_found'
    | 'email_not_confirmed'
    | 'weak_password'
    | 'email_exists'
    | 'phone_exists'
    | 'invalid_email'
    | 'invalid_token'
    | 'network_error'
    | 'unknown'
}

interface AuthContextType {
  session: AppSession | null
  user: AppUser | null
  loading: boolean
  isWelcomeLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithPhone: (phone: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: AuthError | null }>
  updateProfile: (displayName: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Maps Edge Function error codes/messages to localized, user-facing strings.
function parseAuthError(error: any): AuthError {
  if (!error) return { message: t('auth.errUnknown'), type: 'unknown' }

  const type = error.type as string | undefined
  const raw = (error.message || '').toString().toLowerCase()

  const byType: Record<string, AuthError> = {
    invalid_credentials: { message: t('auth.errInvalidCredentials'), type: 'invalid_credentials' },
    user_not_found: { message: t('auth.errUserNotFound'), type: 'user_not_found' },
    weak_password: { message: t('auth.errWeakPassword'), type: 'weak_password' },
    email_exists: { message: t('auth.errAccountExists'), type: 'email_exists' },
    phone_exists: { message: t('auth.errAccountExists'), type: 'phone_exists' },
    invalid_email: { message: t('auth.errGeneric'), type: 'invalid_email' },
    invalid_refresh: { message: t('auth.errInvalidCredentials'), type: 'invalid_credentials' },
    invalid_token: { message: t('auth.errGeneric'), type: 'invalid_token' },
    network_error: { message: t('auth.errNetwork'), type: 'network_error' },
  }
  if (type && byType[type]) return byType[type]

  // Fallback: string matching (network errors, thrown exceptions, etc.).
  if (raw.includes('invalid') && raw.includes('credential')) {
    return { message: t('auth.errInvalidCredentials'), type: 'invalid_credentials' }
  }
  if (raw.includes('network') || raw.includes('fetch') || raw.includes('timeout')) {
    return { message: t('auth.errNetwork'), type: 'network_error' }
  }
  return { message: error.message || t('auth.errGeneric'), type: 'unknown' }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false)
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    // Restore an existing session (page refresh / app relaunch). No welcome
    // splash here — that only shows on a fresh login.
    authClient
      .restoreSession()
      .then((restored) => {
        if (!cancelled) setUser(restored)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (welcomeTimer.current) clearTimeout(welcomeTimer.current)
    }
  }, [])

  // Fresh login → show the welcome splash for 1.5s while data warms up.
  const beginFreshSession = (freshUser: AppUser) => {
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current)
    setUser(freshUser)
    setIsWelcomeLoading(true)
    welcomeTimer.current = setTimeout(() => setIsWelcomeLoading(false), 1500)
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { user: signedIn, error } = await authClient.signInWithEmail(email, password)
      if (error || !signedIn) return { error: parseAuthError(error) }
      beginFreshSession(signedIn)
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      // Local phone numbers are stored/looked up with the +237 country code.
      const { user: signedIn, error } = await authClient.signInWithPhone(`+237${phone}`, password)
      if (error || !signedIn) return { error: parseAuthError(error) }
      beginFreshSession(signedIn)
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    try {
      const { error } = await authClient.signUp(
        email,
        password,
        name,
        phone ? `+237${phone}` : undefined,
      )
      if (error) return { error: parseAuthError(error) }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signOut = async () => {
    if (welcomeTimer.current) clearTimeout(welcomeTimer.current)
    setIsWelcomeLoading(false)
    await authClient.signOut()
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    try {
      await authClient.requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      const { error } = await authClient.confirmPasswordReset(token, password)
      if (error) return { error: parseAuthError(error) }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const updateProfile = async (displayName: string) => {
    try {
      const { user: updated, error } = await authClient.updateProfile(displayName)
      if (error) return { error: parseAuthError(error) }
      if (updated) setUser(updated)
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session: user ? { user } : null,
        user,
        loading,
        isWelcomeLoading,
        signIn,
        signInWithPhone,
        signUp,
        signOut,
        resetPassword,
        confirmPasswordReset,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
