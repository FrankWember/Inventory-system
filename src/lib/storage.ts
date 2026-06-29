import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage keys
const KEYS = {
  THEME: '@bartrack:theme',
  LANGUAGE: '@bartrack:language',
  NOTIFICATIONS: '@bartrack:notifications',
  BAR_INFO: '@bartrack:bar_info',
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

// Notifications
export const getNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(KEYS.NOTIFICATIONS)
    return value === 'true'
  } catch (error) {
    console.error('Error reading notifications setting:', error)
    return false
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

// Cache clearing
export const clearCache = async (): Promise<void> => {
  try {
    // Clear all non-essential data, keep auth and settings
    const allKeys = await AsyncStorage.getAllKeys()
    const keysToRemove = allKeys.filter(
      key =>
        !key.includes('supabase') &&
        !key.includes('@bartrack:theme') &&
        !key.includes('@bartrack:language')
    )
    await AsyncStorage.multiRemove(keysToRemove)
  } catch (error) {
    console.error('Error clearing cache:', error)
    throw error
  }
}

// Data export
export const exportData = async (): Promise<string> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const allData = await AsyncStorage.multiGet(allKeys)
    const dataObject = Object.fromEntries(
      allData.map(([key, value]) => [key, value])
    )
    return JSON.stringify(dataObject, null, 2)
  } catch (error) {
    console.error('Error exporting data:', error)
    throw error
  }
}
