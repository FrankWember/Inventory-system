import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../utils/helpers'
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="bar-chart" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>BarTrack</Text>
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
                color={isActive ? COLORS.primary : COLORS.slate}
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

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: COLORS.white,
    height: '100%',
    flexDirection: 'column',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
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
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
    color: COLORS.slate,
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
    backgroundColor: COLORS.primaryLight,
  },
  navIcon: {
    marginRight: 14,
    width: 24,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.slate,
  },
  navLabelActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '500',
    opacity: 0.7,
  },
})
