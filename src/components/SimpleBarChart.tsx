import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, fmtNum } from '../utils/helpers'

export interface BarChartItem {
  label: string
  value: number
  color?: string
}

interface SimpleBarChartProps {
  data: BarChartItem[]
  height?: number
  formatValue?: (n: number) => string
  horizontal?: boolean
}

export function SimpleBarChart({
  data,
  height = 140,
  formatValue = fmtNum,
  horizontal = false,
}: SimpleBarChartProps) {
  if (data.length === 0) {
    return <Text style={styles.empty}>Aucune donnée</Text>
  }

  const max = Math.max(...data.map(d => d.value), 1)

  if (horizontal) {
    return (
      <View style={styles.horizontal}>
        {data.map((item, i) => (
          <View key={i} style={styles.hRow}>
            <Text style={styles.hLabel} numberOfLines={1}>{item.label}</Text>
            <View style={styles.hBarTrack}>
              <View
                style={[
                  styles.hBarFill,
                  {
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.color ?? COLORS.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.hValue}>{formatValue(item.value)}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.vertical, { height }]}>
      <View style={styles.barsRow}>
        {data.map((item, i) => {
          const barH = Math.max(4, (item.value / max) * (height - 28))
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue} numberOfLines={1}>
                {item.value > 0 ? formatValue(item.value) : ''}
              </Text>
              <View style={[styles.bar, { height: barH, backgroundColor: item.color ?? COLORS.primary }]} />
              <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: COLORS.slate, textAlign: 'center', padding: 16 },
  vertical: { paddingTop: 4 },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, color: COLORS.slate, marginBottom: 4, fontWeight: '600' },
  bar: { width: '75%', borderRadius: 4, minWidth: 8 },
  barLabel: { fontSize: 9, color: COLORS.slate, marginTop: 6, textAlign: 'center' },
  horizontal: { gap: 10 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hLabel: { width: 72, fontSize: 11, color: COLORS.slateDark, fontWeight: '500' },
  hBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.grayLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  hBarFill: { height: '100%', borderRadius: 5 },
  hValue: { width: 56, fontSize: 11, fontWeight: '700', color: COLORS.slateDark, textAlign: 'right' },
})
