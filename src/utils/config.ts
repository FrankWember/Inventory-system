import { Platform } from 'react-native'

/**
 * Get the current app URL based on environment
 * - Production web: Uses EXPO_PUBLIC_PRODUCTION_URL
 * - Development/Local: Uses EXPO_PUBLIC_APP_URL or localhost
 * - Native apps: Returns empty string (not needed for native)
 */
export function getAppUrl(): string {
  // For native platforms, return empty string
  if (Platform.OS !== 'web') {
    return ''
  }

  // Check if we're in production by looking at the hostname
  const isProduction = typeof window !== 'undefined' &&
    (window.location.hostname !== 'localhost' &&
     window.location.hostname !== '127.0.0.1' &&
     !window.location.hostname.includes('192.168'))

  if (isProduction) {
    // Use production URL from env or fallback to current origin
    return process.env.EXPO_PUBLIC_PRODUCTION_URL || window.location.origin
  }

  // Use local development URL
  return process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081'
}

/**
 * Get the redirect URL for email confirmations
 */
export function getRedirectUrl(): string {
  const baseUrl = getAppUrl()
  return baseUrl ? `${baseUrl}/auth/callback` : ''
}
