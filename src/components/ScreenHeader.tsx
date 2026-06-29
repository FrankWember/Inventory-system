import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, FONT } from '../utils/helpers'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  style?: ViewStyle
}

export function ScreenHeader({ title, subtitle, right, style }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }, style]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
})
