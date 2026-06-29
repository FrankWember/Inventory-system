import React from 'react'
import { View, StyleSheet } from 'react-native'
import { COLORS, getStockColor, getStockStatus } from '../utils/helpers'

interface StockProgressBarProps {
  stock: number
  minStock: number
}

/** Bar scale: 0 → 2× min_stock (recommended level sits at 50%) */
export function StockProgressBar({ stock, minStock }: StockProgressBarProps) {
  const status = getStockStatus(stock, minStock)
  const maxRef = Math.max(minStock * 2, 1)
  const fillPct = Math.min(100, (stock / maxRef) * 100)
  const minMarkerPct = Math.min(100, (minStock / maxRef) * 100)

  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${fillPct}%`, backgroundColor: getStockColor(status) },
        ]}
      />
      {minStock > 0 && (
        <View style={[styles.marker, { left: `${minMarkerPct}%` }]} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: COLORS.grayLight,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 6,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 1.5,
  },
  marker: {
    position: 'absolute',
    top: -0.5,
    width: 1.5,
    height: 4,
    backgroundColor: COLORS.slateDark,
    opacity: 0.4,
    marginLeft: -0.75,
  },
})
