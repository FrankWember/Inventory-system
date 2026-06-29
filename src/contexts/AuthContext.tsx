import React, { createContext, useContext, useState, useEffect } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isWelcomeLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithPhone: (phone: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name?: string, phone?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' && session) {
        // Show welcome screen for 2 seconds
        setIsWelcomeLoading(true)
        setTimeout(() => {
          setIsWelcomeLoading(false)
          setSession(session)
          setUser(session?.user ?? null)
        }, 2000)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signInWithPhone = async (phone: string, password: string) => {
    try {
      // Format phone as email for Supabase (e.g., +237123456789@phone.bartrack.app)
      const phoneEmail = `+237${phone}@phone.bartrack.app`
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, name?: string, phone?: string) => {
    try {
      // If phone is provided, use phone-based email
      const authEmail = phone ? `+237${phone}@phone.bartrack.app` : email

      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            display_name: name,
            phone: phone ? `+237${phone}` : undefined,
            actual_email: phone ? email : undefined,
          },
        },
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      return { error }
    } catch (error) {
      return { error: error as Error }
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
