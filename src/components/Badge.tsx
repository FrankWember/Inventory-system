import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { COLORS } from '../utils/helpers'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Badge({ children, variant = 'default', style, textStyle }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], style]}>
      <Text style={[styles.badgeText, styles[`badgeText_${variant}`], textStyle]}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badge_default: {
    backgroundColor: COLORS.slateLight,
  },
  badge_success: {
    backgroundColor: COLORS.emeraldLight,
  },
  badge_danger: {
    backgroundColor: COLORS.roseLight,
  },
  badge_warning: {
    backgroundColor: COLORS.amberLight,
  },
  badge_info: {
    backgroundColor: COLORS.skyLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeText_default: {
    color: COLORS.slate,
  },
  badgeText_success: {
    color: COLORS.emerald,
  },
  badgeText_danger: {
    color: COLORS.rose,
  },
  badgeText_warning: {
    color: COLORS.amberDark,
  },
  badgeText_info: {
    color: COLORS.sky,
  },
})
