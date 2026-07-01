import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import {
  Theme,
  Language,
  BarInfo,
  getTheme,
  setTheme as saveTheme,
  getLanguage,
  setLanguage as saveLanguage,
  getNotificationsEnabled,
  setNotificationsEnabled as saveNotificationsEnabled,
  getBarInfo,
  setBarInfo as saveBarInfo,
} from '../lib/storage'
import { getColors, LIGHT_COLORS } from '../styles/theme'

interface SettingsContextType {
  theme: Theme
  language: Language
  notificationsEnabled: boolean
  barInfo: BarInfo | null
  loading: boolean
  colors: typeof LIGHT_COLORS
  setTheme: (theme: Theme) => Promise<void>
  setLanguage: (language: Language) => Promise<void>
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
  updateBarInfo: (info: BarInfo) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [language, setLanguageState] = useState<Language>('fr')
  const [notificationsEnabled, setNotificationsState] = useState(false)
  const [barInfo, setBarInfoState] = useState<BarInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [theme, language, notifications, barInfo] = await Promise.all([
        getTheme(),
        getLanguage(),
        getNotificationsEnabled(),
        getBarInfo(),
      ])

      setThemeState(theme)
      setLanguageState(language)
      setNotificationsState(notifications)
      setBarInfoState(barInfo)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const setTheme = async (newTheme: Theme) => {
    try {
      await saveTheme(newTheme)
      setThemeState(newTheme)
    } catch (error) {
      console.error('Error setting theme:', error)
      throw error
    }
  }

  const setLanguage = async (newLanguage: Language) => {
    try {
      await saveLanguage(newLanguage)
      setLanguageState(newLanguage)
    } catch (error) {
      console.error('Error setting language:', error)
      throw error
    }
  }

  const setNotificationsEnabled = async (enabled: boolean) => {
    try {
      await saveNotificationsEnabled(enabled)
      setNotificationsState(enabled)
    } catch (error) {
      console.error('Error setting notifications:', error)
      throw error
    }
  }

  const updateBarInfo = async (info: BarInfo) => {
    try {
      await saveBarInfo(info)
      setBarInfoState(info)
    } catch (error) {
      console.error('Error updating bar info:', error)
      throw error
    }
  }

  // Get theme-aware colors
  const colors = useMemo(() => getColors(theme), [theme])

  return (
    <SettingsContext.Provider
      value={{
        theme,
        language,
        notificationsEnabled,
        barInfo,
        loading,
        colors,
        setTheme,
        setLanguage,
        setNotificationsEnabled,
        updateBarInfo,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
