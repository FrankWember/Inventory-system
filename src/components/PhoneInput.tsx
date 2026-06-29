import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { COLORS, FONT } from '../utils/helpers'

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string
  value: string
  onChangeText: (text: string) => void
  error?: string
}

export function PhoneInput({ label, value, onChangeText, error, ...props }: PhoneInputProps) {
  const handleChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '')
    // Limit to 9 digits (Cameroon phone without country code)
    if (cleaned.length <= 9) {
      onChangeText(cleaned)
    }
  }

  const formatDisplay = (val: string) => {
    // Format as XXX XXX XXX for better readability
    if (val.length <= 3) return val
    if (val.length <= 6) return `${val.slice(0, 3)} ${val.slice(3)}`
    return `${val.slice(0, 3)} ${val.slice(3, 6)} ${val.slice(6)}`
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>🇨🇲 +237</Text>
        </View>
        <TextInput
          style={styles.input}
          value={formatDisplay(value)}
          onChangeText={handleChange}
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.slate400}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.slateDark,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: COLORS.rose,
  },
  countryCode: {
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.rose,
    marginTop: 4,
    marginLeft: 4,
  },
})
