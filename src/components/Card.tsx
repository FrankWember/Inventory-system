import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { useSettings } from '../contexts/SettingsContext'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  const { colors } = useSettings()
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.black }, style]}>
      {children}
    </View>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  style?: ViewStyle
  titleStyle?: TextStyle
}

export function CardHeader({ title, subtitle, style, titleStyle }: CardHeaderProps) {
  const { colors } = useSettings()
  return (
    <View style={[styles.cardHeader, style]}>
      <Text style={[styles.cardTitle, { color: colors.slateDark }, titleStyle]}>{title}</Text>
      {subtitle && <Text style={[styles.cardSubtitle, { color: colors.slate }]}>{subtitle}</Text>}
    </View>
  )
}

interface CardContentProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardContent: {
    // Additional content styling if needed
  },
})
