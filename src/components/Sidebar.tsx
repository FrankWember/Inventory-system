import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ThemeColors } from '../utils/helpers'
import type { TabParamList } from '../../App'

interface SidebarProps {
  currentRoute: keyof TabParamList
  onNavigate: (route: keyof TabParamList) => void
}

interface NavItem {
  name: keyof TabParamList
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconOutline: keyof typeof Ionicons.glyphMap
}

const navItems: NavItem[] = [
  { name: 'Dashboard', label: 'Accueil', icon: 'home', iconOutline: 'home-outline' },
  { name: 'Inventory', label: 'Stock', icon: 'cube', iconOutline: 'cube-outline' },
  { name: 'Session', label: 'Session', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { name: 'Trends', label: 'Stats', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { name: 'Settings', label: 'Paramètres', icon: 'settings', iconOutline: 'settings-outline' },
]

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const { barInfo, colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="bar-chart" size={28} color={colors.primary} />
        </View>
        <Text style={styles.appName}>{barInfo?.name || 'BarTrack'}</Text>
        <Text style={styles.appSubtitle}>Gestion d'inventaire</Text>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.name
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={22}
                color={isActive ? colors.primary : colors.slate}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: colors.white,
    height: '100%',
    flexDirection: 'column',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    marginVertical: 20,
    marginLeft: 20,
    ...Platform.select({
      web: {
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  header: {
    padding: 32,
    paddingBottom: 28,
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slateDark,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
    color: colors.slate,
    textAlign: 'center',
  },
  nav: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  navIcon: {
    marginRight: 14,
    width: 24,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate,
  },
  navLabelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 11,
    color: colors.slate,
    fontWeight: '500',
    opacity: 0.7,
  },
})
