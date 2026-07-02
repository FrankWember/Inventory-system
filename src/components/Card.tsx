import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { ThemeColors } from '../utils/helpers'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
}

export function Card({ children, style }: CardProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return <View style={[styles.card, style]}>{children}</View>
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  style?: ViewStyle
  titleStyle?: TextStyle
}

export function CardHeader({ title, subtitle, style, titleStyle }: CardHeaderProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return <View style={[styles.cardContent, style]}>{children}</View>
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slateDark,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.slate,
    lineHeight: 18,
  },
  cardContent: {
    // Additional content styling if needed
  },
})
