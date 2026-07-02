import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native'
import { ThemeColors } from '../utils/helpers'

interface ButtonProps {
  onPress: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ]

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
    disabled && styles.buttonText_disabled,
    textStyle,
  ]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.white} />
      ) : (
        <Text style={textStyles}>{children}</Text>
      )}
    </TouchableOpacity>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button_primary: {
    backgroundColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.slate,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  button_danger: {
    backgroundColor: colors.rose,
  },
  button_disabled: {
    opacity: 0.5,
  },
  button_small: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: '600',
  },
  buttonText_primary: {
    color: colors.white,
  },
  buttonText_secondary: {
    color: colors.white,
  },
  buttonText_outline: {
    color: colors.primary,
  },
  buttonText_danger: {
    color: colors.white,
  },
  buttonText_disabled: {
    opacity: 0.7,
  },
  buttonText_small: {
    fontSize: 13,
  },
  buttonText_medium: {
    fontSize: 15,
  },
  buttonText_large: {
    fontSize: 17,
  },
})
