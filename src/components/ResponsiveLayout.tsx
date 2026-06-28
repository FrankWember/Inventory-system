import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Dimensions, Platform } from 'react-native'
import { useNavigation, NavigationState, useNavigationState } from '@react-navigation/native'
import { Sidebar } from './Sidebar'
import { COLORS } from '../utils/helpers'
import type { TabParamList } from '../../App'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

const BREAKPOINT = 768 // Tablet/Desktop breakpoint

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)
  const navigation = useNavigation()
  
  // Get current route name
  const currentRoute = useNavigationState((state) => {
    if (!state) return 'Dashboard'
    const route = state.routes[state.index]
    return route.name as keyof TabParamList
  })

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  const handleNavigate = (route: keyof TabParamList) => {
    navigation.navigate(route as never)
  }

  if (!isDesktop) {
    // Mobile/Tablet view - just render children with bottom tabs
    return <>{children}</>
  }

  // Desktop view - render with sidebar
  return (
    <View style={styles.container}>
      <Sidebar currentRoute={currentRoute} onNavigate={handleNavigate} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
})
