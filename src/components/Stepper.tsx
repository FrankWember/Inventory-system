import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../utils/helpers'

interface StepperProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  compact?: boolean
}

export function Stepper({
  value,
  onValueChange,
  min = 0,
  max = 9999,
  label,
  compact = false,
}: StepperProps) {
  const handleIncrement = () => {
    if (value < max) {
      onValueChange(value + 1)
    }
  }

  const handleDecrement = () => {
    if (value > min) {
      onValueChange(value - 1)
    }
  }

  const handleTextChange = (text: string) => {
    const num = parseInt(text) || 0
    if (num >= min && num <= max) {
      onValueChange(num)
    }
  }

  const buttonSize = compact ? 36 : 44
  const iconSize = compact ? 18 : 24

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {label && <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>}
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={value <= min}
          style={[
            styles.button,
            styles.decrementButton,
            { width: buttonSize, height: buttonSize },
            value <= min && styles.buttonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="remove"
            size={iconSize}
            color={value <= min ? COLORS.slate : COLORS.rose}
          />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, compact && styles.inputCompact]}
          value={value.toString()}
          onChangeText={handleTextChange}
          keyboardType="number-pad"
          textAlign="center"
          selectTextOnFocus
        />

        <TouchableOpacity
          onPress={handleIncrement}
          disabled={value >= max}
          style={[
            styles.button,
            styles.incrementButton,
            { width: buttonSize, height: buttonSize },
            value >= max && styles.buttonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={iconSize} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  containerCompact: {
    marginBottom: 0,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.slate,
    marginBottom: 6,
  },
  labelCompact: {
    fontSize: 11,
    marginBottom: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCompact: {
    height: 36,
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decrementButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementButton: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.slateLight,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slateDark,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
})
