import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Dimensions, Platform } from 'react-native'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { Sidebar } from './Sidebar'
import { useSettings } from '../contexts/SettingsContext'
import type { TabParamList } from '../../App'

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

const BREAKPOINT = 768 // Tablet/Desktop breakpoint

const TAB_ROUTES: (keyof TabParamList)[] = ['Dashboard', 'Inventory', 'Session', 'Trends', 'Settings']

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)
  const navigation = useNavigation()
  const { colors } = useSettings()

  // The nearest navigator here is the root Stack (this component wraps the Tab
  // navigator from inside the MainTabs screen), so drill into nested state to
  // find the focused tab — the stack-level route is always just "MainTabs".
  const currentRoute = useNavigationState((state) => {
    if (!state) return 'Dashboard' as keyof TabParamList
    let route: any = state.routes[state.index]
    while (route?.state?.routes?.length) {
      // On deep links the nested state can be "stale" (PartialState) with no
      // index yet — the focused route is then the last one in the list.
      const nested = route.state
      route = nested.routes[typeof nested.index === 'number' ? nested.index : nested.routes.length - 1]
    }
    return (TAB_ROUTES.includes(route?.name) ? route.name : 'Dashboard') as keyof TabParamList
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Sidebar currentRoute={currentRoute} onNavigate={handleNavigate} />
      <View style={[styles.content, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    ...Platform.select({
      web: {
        height: '100vh',
        overflow: 'hidden',
      } as any,
    }),
  },
  content: {
    flex: 1,
    margin: 20,
    marginLeft: 16,
    borderRadius: 20,
    overflow: 'auto',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
      },
    }),
  },
})
