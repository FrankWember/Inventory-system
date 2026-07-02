import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { ThemeColors } from '../utils/helpers'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Badge({ children, variant = 'default', style, textStyle }: BadgeProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], style]}>
      <Text style={[styles.badgeText, styles[`badgeText_${variant}`], textStyle]}>
        {children}
      </Text>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badge_default: {
    backgroundColor: colors.slateLight,
  },
  badge_success: {
    backgroundColor: colors.primaryLight,
  },
  badge_danger: {
    backgroundColor: colors.roseLight,
  },
  badge_warning: {
    backgroundColor: colors.primaryLight,
  },
  badge_info: {
    backgroundColor: colors.skyLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeText_default: {
    color: colors.slate,
  },
  badgeText_success: {
    color: colors.primary,
  },
  badgeText_danger: {
    color: colors.rose,
  },
  badgeText_warning: {
    color: colors.primaryDark,
  },
  badgeText_info: {
    color: colors.sky,
  },
})
