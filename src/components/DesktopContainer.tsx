import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, StyleSheet, Platform, Dimensions } from 'react-native'
import { ThemeColors } from '../utils/helpers'

interface DesktopContainerProps {
  children: React.ReactNode
  maxWidth?: number
}

const BREAKPOINT = 768

export function DesktopContainer({ children, maxWidth = 1200 }: DesktopContainerProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const windowWidth = Dimensions.get('window').width
  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  if (!isDesktop) {
    return <>{children}</>
  }

  return (
    <View style={styles.container}>
      <View style={[styles.content, { maxWidth }]}>
        {children}
      </View>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.surface,
  },
})
