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
  { name: 'Finances', label: 'Finances', icon: 'wallet', iconOutline: 'wallet-outline' },
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
    width: 240,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: '100%',
    flexDirection: 'column',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.slate,
    textAlign: 'center',
  },
  nav: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
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
    marginRight: 12,
    width: 22,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.slate,
  },
  navLabelActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  version: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '500',
  },
})
