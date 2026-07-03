import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage keys
const KEYS = {
  THEME: '@bartrack:theme',
  LANGUAGE: '@bartrack:language',
  NOTIFICATIONS: '@bartrack:notifications',
  NOTIF_LAST_AT: '@bartrack:notif_last_at',
  NOTIF_ROTATION: '@bartrack:notif_rotation',
  BAR_INFO: '@bartrack:bar_info',
  ONBOARDING_COMPLETED: '@bartrack:onboarding_completed',
} as const

export type Theme = 'light' | 'dark'
export type Language = 'fr' | 'en'

export interface BarInfo {
  name: string
  address?: string
  phone?: string
}

// Theme
export const getTheme = async (): Promise<Theme> => {
  try {
    const theme = await AsyncStorage.getItem(KEYS.THEME)
    return (theme as Theme) || 'light'
  } catch (error) {
    console.error('Error reading theme:', error)
    return 'light'
  }
}

export const setTheme = async (theme: Theme): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.THEME, theme)
  } catch (error) {
    console.error('Error saving theme:', error)
    throw error
  }
}

// Language
export const getLanguage = async (): Promise<Language> => {
  try {
    const language = await AsyncStorage.getItem(KEYS.LANGUAGE)
    return (language as Language) || 'fr'
  } catch (error) {
    console.error('Error reading language:', error)
    return 'fr'
  }
}

export const setLanguage = async (language: Language): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.LANGUAGE, language)
  } catch (error) {
    console.error('Error saving language:', error)
    throw error
  }
}

// Notifications — ON by default (engagement): only an explicit 'false' disables them.
export const getNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.NOTIFICATIONS)
    return value === null ? true : value === 'true'
  } catch (error) {
    console.error('Error reading notifications setting:', error)
    return true
  }
}

export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, enabled.toString())
  } catch (error) {
    console.error('Error saving notifications setting:', error)
    throw error
  }
}

// Timestamp (ms) of the last engagement notification sent — drives the cooldown.
export const getNotificationLastAt = async (): Promise<number> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.NOTIF_LAST_AT)
    const n = value ? Number(value) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export const setNotificationLastAt = async (ms: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.NOTIF_LAST_AT, String(ms))
  } catch (error) {
    console.error('Error saving notification timestamp:', error)
  }
}

// Round-robin index so each notification rotates to a different insight.
export const getNotificationRotation = async (): Promise<number> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.NOTIF_ROTATION)
    const n = value ? Number(value) : 0
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

export const setNotificationRotation = async (index: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.NOTIF_ROTATION, String(index))
  } catch (error) {
    console.error('Error saving notification rotation:', error)
  }
}

// Bar Info
export const getBarInfo = async (): Promise<BarInfo | null> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.BAR_INFO)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Error reading bar info:', error)
    return null
  }
}

export const setBarInfo = async (info: BarInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.BAR_INFO, JSON.stringify(info))
  } catch (error) {
    console.error('Error saving bar info:', error)
    throw error
  }
}

// Keys that must survive a cache clear and must NEVER leave the device in an
// export: session tokens (custom auth) and user identity.
const SENSITIVE_KEYS = [
  '@bartrack:access_token',
  '@bartrack:refresh_token',
  '@bartrack:token_expires_at',
  '@bartrack:auth_user',
]

// Cache clearing
export const clearCache = async (): Promise<void> => {
  try {
    // Clear all non-essential data, keep auth and settings
    const keep = new Set<string>([...SENSITIVE_KEYS, ...Object.values(KEYS)])
    const allKeys = await AsyncStorage.getAllKeys()
    const keysToRemove = allKeys.filter(key => !keep.has(key) && !key.includes('supabase'))
    await AsyncStorage.multiRemove(keysToRemove)
  } catch (error) {
    console.error('Error clearing cache:', error)
    throw error
  }
}

// Onboarding
export const getOnboardingStatus = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED)
    return value === 'true'
  } catch (error) {
    console.error('Error reading onboarding status:', error)
    return false
  }
}

export const setOnboardingCompleted = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, 'true')
  } catch (error) {
    console.error('Error saving onboarding status:', error)
    throw error
  }
}

// Data export — never include session tokens or other credentials: a shared
// export file must not grant access to the account.
export const exportData = async (): Promise<string> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const safeKeys = allKeys.filter(
      key => !SENSITIVE_KEYS.includes(key) && !key.startsWith('sb-') && !key.includes('auth')
    )
    const allData = await AsyncStorage.multiGet(safeKeys)
    const dataObject = Object.fromEntries(
      allData.map(([key, value]) => [key, value])
    )
    return JSON.stringify(dataObject, null, 2)
  } catch (error) {
    console.error('Error exporting data:', error)
    throw error
  }
}
