import React from 'react'
import { View, StyleSheet, Platform, Dimensions } from 'react-native'
import { COLORS } from '../utils/helpers'

interface DesktopContainerProps {
  children: React.ReactNode
  maxWidth?: number
}

const BREAKPOINT = 768

export function DesktopContainer({ children, maxWidth = 1200 }: DesktopContainerProps) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  content: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.surface,
  },
})
