import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FONT, ThemeColors } from '../utils/helpers'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  left?: React.ReactNode
  right?: React.ReactNode
  onBack?: () => void
  style?: ViewStyle
}

export function ScreenHeader({ title, subtitle, left, right, onBack, style }: ScreenHeaderProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }, style]}>
      {(left || onBack) && (
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.slateDark} />
            </TouchableOpacity>
          ) : (
            left
          )}
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    marginRight: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
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
    color: colors.slateDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: colors.slate,
    marginTop: 2,
  },
  right: {
    marginLeft: 12,
  },
})
