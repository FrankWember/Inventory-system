import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Input } from './Input'
import { COLORS, FONT } from '../utils/helpers'
import { useTranslation } from '../i18n'

interface DualStockInputProps {
  label: string
  totalUnits: number
  cassierQuantity: number
  onChange: (totalUnits: number) => void
}

/**
 * DualStockInput - A component for entering stock in both crates and units
 *
 * Allows users to input stock as "X crates + Y units" instead of just a single value.
 * Automatically calculates the total units and syncs both inputs.
 */
export function DualStockInput({
  label,
  totalUnits,
  cassierQuantity,
  onChange,
}: DualStockInputProps) {
  const { t } = useTranslation()
  // Calculate crates and units from total
  const crates = cassierQuantity > 0 ? Math.floor(totalUnits / cassierQuantity) : 0
  const units = cassierQuantity > 0 ? totalUnits % cassierQuantity : totalUnits

  const [cratesValue, setCratesValue] = useState(crates.toString())
  const [unitsValue, setUnitsValue] = useState(units.toString())

  // Update local state when totalUnits changes externally
  useEffect(() => {
    const newCrates = cassierQuantity > 0 ? Math.floor(totalUnits / cassierQuantity) : 0
    const newUnits = cassierQuantity > 0 ? totalUnits % cassierQuantity : totalUnits
    setCratesValue(newCrates.toString())
    setUnitsValue(newUnits.toString())
  }, [totalUnits, cassierQuantity])

  const handleCratesChange = (text: string) => {
    setCratesValue(text)
    const cratesNum = parseInt(text) || 0
    const unitsNum = parseInt(unitsValue) || 0
    const newTotal = cratesNum * cassierQuantity + unitsNum
    onChange(newTotal)
  }

  const handleUnitsChange = (text: string) => {
    setUnitsValue(text)
    const cratesNum = parseInt(cratesValue) || 0
    const unitsNum = parseInt(text) || 0

    // If units exceed cassierQuantity, automatically convert to crates
    if (unitsNum >= cassierQuantity && cassierQuantity > 0) {
      const additionalCrates = Math.floor(unitsNum / cassierQuantity)
      const remainingUnits = unitsNum % cassierQuantity
      const newCrates = cratesNum + additionalCrates
      setCratesValue(newCrates.toString())
      setUnitsValue(remainingUnits.toString())
      const newTotal = newCrates * cassierQuantity + remainingUnits
      onChange(newTotal)
    } else {
      const newTotal = cratesNum * cassierQuantity + unitsNum
      onChange(newTotal)
    }
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Input
            label={t('session.racks')}
            value={cratesValue}
            onChangeText={handleCratesChange}
            keyboardType="number-pad"
            placeholder="0"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={styles.separator}>
          <Text style={styles.separatorText}>+</Text>
        </View>
        <View style={styles.inputWrapper}>
          <Input
            label={t('session.unitsLabel')}
            value={unitsValue}
            onChangeText={handleUnitsChange}
            keyboardType="number-pad"
            placeholder="0"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>
      {cassierQuantity > 0 && (
        <Text style={styles.totalText}>
          Total: {totalUnits} {t('inventory.unitsLower')}
        </Text>
      )}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  separator: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  separatorText: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slate,
  },
  totalText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    marginTop: 6,
    marginLeft: 4,
  },
})
