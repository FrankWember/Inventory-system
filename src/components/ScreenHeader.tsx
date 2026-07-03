import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FONT } from '../utils/helpers'
import { LIGHT_COLORS } from '../styles/theme'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  left?: React.ReactNode
  right?: React.ReactNode
  onBack?: () => void
  style?: ViewStyle
  colors?: typeof LIGHT_COLORS
}

export function ScreenHeader({ title, subtitle, left, right, onBack, style, colors = LIGHT_COLORS }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[
      styles.container,
      {
        paddingTop: insets.top + 8,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      },
      style
    ]}>
      {(left || onBack) && (
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.surface }]}>
              <Ionicons name="arrow-back" size={24} color={colors.slateDark} />
            </TouchableOpacity>
          ) : (
            left
          )}
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.slateDark }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.slate }]}>{subtitle}</Text> : null}
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
    borderBottomWidth: 1,
  },
  left: {
    marginRight: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
})
