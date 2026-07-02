import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { FONT, ThemeColors } from '../utils/helpers'

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string
  value: string
  onChangeText: (text: string) => void
  error?: string
}

export function PhoneInput({ label, value, onChangeText, error, ...props }: PhoneInputProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const handleChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '')
    // Limit to 9 digits (Cameroon phone without country code)
    if (cleaned.length <= 9) {
      onChangeText(cleaned)
    }
  }

  const formatDisplay = (val: string) => {
    // Format as X XX XX XX XX for better readability (e.g., 6 79 12 28 78)
    if (val.length <= 1) return val
    if (val.length <= 3) return `${val.slice(0, 1)} ${val.slice(1)}`
    if (val.length <= 5) return `${val.slice(0, 1)} ${val.slice(1, 3)} ${val.slice(3)}`
    if (val.length <= 7) return `${val.slice(0, 1)} ${val.slice(1, 3)} ${val.slice(3, 5)} ${val.slice(5)}`
    return `${val.slice(0, 1)} ${val.slice(1, 3)} ${val.slice(3, 5)} ${val.slice(5, 7)} ${val.slice(7)}`
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
          placeholderTextColor={colors.slate400}
          {...props}
        />
      </View>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: colors.rose,
  },
  countryCode: {
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: colors.slateDark,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: FONT.medium,
    color: colors.slateDark,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: colors.rose,
    marginTop: 4,
    marginLeft: 4,
  },
})
