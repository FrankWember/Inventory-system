import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getRedirectUrl } from '../utils/config'
import { t } from '../i18n'

interface AuthError {
  message: string
  type?: 'invalid_credentials' | 'user_not_found' | 'email_not_confirmed' | 'weak_password' | 'email_exists' | 'phone_exists' | 'network_error' | 'unknown'
}

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isWelcomeLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithPhone: (phone: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (displayName: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function parseAuthError(error: any): AuthError {
  if (!error) return { message: t('auth.errUnknown'), type: 'unknown' }

  const errorMessage = error.message?.toLowerCase() || ''

  if (errorMessage.includes('invalid login credentials') ||
      errorMessage.includes('invalid password') ||
      errorMessage.includes('wrong password')) {
    return { message: t('auth.errInvalidCredentials'), type: 'invalid_credentials' }
  }
  if (errorMessage.includes('user not found') || errorMessage.includes('no user found')) {
    return { message: t('auth.errUserNotFound'), type: 'user_not_found' }
  }
  if (errorMessage.includes('email not confirmed') || errorMessage.includes('email address not confirmed')) {
    return { message: t('auth.errEmailNotConfirmed'), type: 'email_not_confirmed' }
  }
  if (errorMessage.includes('password') && errorMessage.includes('weak')) {
    return { message: t('auth.errWeakPassword'), type: 'weak_password' }
  }
  if (errorMessage.includes('user already registered') ||
      errorMessage.includes('email already registered') ||
      errorMessage.includes('already exists')) {
    return { message: t('auth.errAccountExists'), type: 'email_exists' }
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
    return { message: t('auth.errNetwork'), type: 'network_error' }
  }

  return { message: error.message || t('auth.errGeneric'), type: 'unknown' }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false)
  // Tracks whether the app started with an existing session (page refresh vs fresh login)
  const isRestoredSession = useRef(false)

  useEffect(() => {
    let welcomeTimer: ReturnType<typeof setTimeout> | null = null

    // Get initial session — if one exists, this is a page refresh, not a fresh login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        isRestoredSession.current = true
      }
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' && session && !isRestoredSession.current) {
        // Fresh login (not a page refresh or token refresh)
        isRestoredSession.current = true
        setIsWelcomeLoading(true)
        welcomeTimer = setTimeout(() => {
          setIsWelcomeLoading(false)
          setSession(session)
          setUser(session?.user ?? null)
        }, 1500)
      } else {
        // Page refresh, token refresh, sign-out, etc.
        if (_event === 'SIGNED_IN') {
          isRestoredSession.current = true
        }
        if (_event === 'SIGNED_OUT') {
          isRestoredSession.current = false
          // A pending welcome timer would re-apply the stale session after sign-out
          if (welcomeTimer) {
            clearTimeout(welcomeTimer)
            welcomeTimer = null
          }
          setIsWelcomeLoading(false)
        }
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => {
      if (welcomeTimer) clearTimeout(welcomeTimer)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: parseAuthError(error) }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      const phoneEmail = `+237${phone}@phone.bartrack.app`
      const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail, password })
      if (error) {
        const parsed = parseAuthError(error)
        // A phone account has no inbox — "confirm your email" is impossible
        // advice. Surface the real problem instead.
        if (parsed.type === 'email_not_confirmed') {
          return {
            error: {
              message: t('auth.errPhonePendingActivation'),
              type: 'email_not_confirmed' as const,
            },
          }
        }
        return { error: parsed }
      }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    try {
      const authEmail = phone ? `+237${phone}@phone.bartrack.app` : email
      const redirectUrl = getRedirectUrl()

      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          // Phone accounts use a synthetic inbox-less address — never send a
          // confirmation link there (see supabase-auto-confirm-phone.sql).
          emailRedirectTo: phone ? undefined : (redirectUrl || undefined),
          data: {
            display_name: name,
            phone: phone ? `+237${phone}` : undefined,
            actual_email: phone ? email : undefined,
          },
        },
      })
      if (error) return { error: parseAuthError(error) }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = getRedirectUrl()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl || undefined,
      })
      if (error) return { error: parseAuthError(error) }
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  const updateProfile = async (displayName: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      })
      if (error) return { error: parseAuthError(error) }
      // Refresh user state
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) setUser(updatedUser)
      return { error: null }
    } catch (error) {
      return { error: parseAuthError(error) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isWelcomeLoading,
        signIn,
        signInWithPhone,
        signUp,
        signOut,
        resetPassword,
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
