import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Logo } from './Logo'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'
import type { TabParamList } from '../../App'

interface SidebarProps {
  currentRoute: keyof TabParamList
  onNavigate: (route: keyof TabParamList) => void
}

interface NavItem {
  name: keyof TabParamList
  labelKey: string
  icon: keyof typeof Ionicons.glyphMap
  iconOutline: keyof typeof Ionicons.glyphMap
}

const navItems: NavItem[] = [
  { name: 'Dashboard', labelKey: 'misc.tabHome', icon: 'home', iconOutline: 'home-outline' },
  { name: 'Inventory', labelKey: 'misc.tabStock', icon: 'cube', iconOutline: 'cube-outline' },
  { name: 'Session', labelKey: 'misc.tabSession', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { name: 'Trends', labelKey: 'misc.tabStats', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { name: 'Settings', labelKey: 'misc.tabSettings', icon: 'settings', iconOutline: 'settings-outline' },
]

export function Sidebar({ currentRoute, onNavigate }: SidebarProps) {
  const { barInfo, colors } = useSettings()
  const { t } = useTranslation()

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: colors.primaryLight }]}>
          <Logo size={28} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.slateDark }]}>{barInfo?.name || 'BarTrack'}</Text>
        <Text style={[styles.appSubtitle, { color: colors.slate }]}>{t('misc.sidebarSubtitle')}</Text>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.name
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && { backgroundColor: colors.primaryLight }]}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={22}
                color={isActive ? colors.primary : colors.slate}
                style={styles.navIcon}
              />
              <Text style={[styles.navLabel, { color: colors.slate }, isActive && [styles.navLabelActive, { color: colors.primary }]]}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.version, { color: colors.slate }]}>v1.0.0</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 280,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 13,
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
  navIcon: {
    marginRight: 14,
    width: 24,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
  },
})
