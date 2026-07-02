import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native'
import { FONT, ThemeColors } from '../utils/helpers'

interface InputComponentProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputComponentProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colors.slate400}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: colors.slateDark,
    backgroundColor: colors.white,
    letterSpacing: -0.2,
  },
  inputError: {
    borderColor: colors.rose,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: colors.rose,
    marginTop: 4,
    marginLeft: 4,
  },
})
