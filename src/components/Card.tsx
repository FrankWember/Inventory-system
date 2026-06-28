import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { COLORS } from '../utils/helpers'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  style?: ViewStyle
  titleStyle?: TextStyle
}

export function CardHeader({ title, subtitle, style, titleStyle }: CardHeaderProps) {
  return (
    <View style={[styles.cardHeader, style]}>
      <Text style={[styles.cardTitle, titleStyle]}>{title}</Text>
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
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
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  cardContent: {
    // Additional content styling if needed
  },
})
