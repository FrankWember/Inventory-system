// Polyfills required for Supabase in React Native
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from './authTokens'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly at startup instead of letting every request die with a
  // cryptic fetch error when the build is missing its env vars.
  throw new Error(
    'Configuration Supabase manquante: définissez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (fichier .env).'
  )
}

// We do NOT use Supabase Auth. Instead we mint our own JWTs (Edge Functions,
// signed with the project JWT secret) and hand them to PostgREST via the
// `accessToken` option. This disables supabase.auth.* and makes every DB request
// carry our token, so RLS `auth.uid()` keeps isolating each user's rows.
// getValidAccessToken() returns the anon key when logged out.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => await getValidAccessToken(),
})
