import React from 'react'
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native'
import { COLORS, FONT } from '../utils/helpers'

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
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={COLORS.slate400}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.slateDark,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
    backgroundColor: COLORS.white,
    letterSpacing: -0.2,
  },
  inputError: {
    borderColor: COLORS.rose,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.rose,
    marginTop: 4,
    marginLeft: 4,
  },
})
