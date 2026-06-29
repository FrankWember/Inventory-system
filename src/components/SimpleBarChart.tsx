import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, FONT, fmtNum } from '../utils/helpers'

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

// Pure React Native Views — renders identically and reliably on web + native
// (no chart library), and keeps the look minimal.
export function SimpleBarChart({
  data,
  height = 200,
  formatValue = fmtNum,
  horizontal = false,
}: SimpleBarChartProps) {
  if (data.length === 0) return <Text style={styles.empty}>Aucune donnée</Text>

  const max = Math.max(...data.map(d => Math.abs(d.value)), 1)

  if (horizontal) {
    return (
      <View style={styles.hWrap}>
        {data.map((d, i) => (
          <View key={i} style={styles.hRow}>
            <Text style={styles.hLabel} numberOfLines={1}>{d.label}</Text>
            <View style={styles.hTrack}>
              <View
                style={[
                  styles.hFill,
                  { width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%`, backgroundColor: d.color ?? COLORS.primary },
                ]}
              />
            </View>
            <Text style={styles.hValue} numberOfLines={1}>{formatValue(d.value)}</Text>
          </View>
        ))}
      </View>
    )
  }

  const plot = height - 38 // room for value + axis labels
  return (
    <View style={[styles.vWrap, { height }]}>
      <View style={styles.vPlot}>
        {data.map((d, i) => {
          const h = Math.max(3, (Math.abs(d.value) / max) * plot)
          return (
            <View key={i} style={styles.vCol}>
              <Text style={styles.vValue} numberOfLines={1}>{d.value !== 0 ? formatValue(d.value) : ''}</Text>
              <View style={[styles.vBar, { height: h, backgroundColor: d.color ?? COLORS.primary }]} />
            </View>
          )
        })}
      </View>
      <View style={styles.vAxis}>
        {data.map((d, i) => (
          <Text key={i} style={styles.vAxisLabel} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: COLORS.slate, textAlign: 'center', padding: 16, fontFamily: FONT.medium },

  // vertical
  vWrap: { width: '100%' },
  vPlot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  vCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  vValue: { fontSize: 10, color: COLORS.slate, fontFamily: FONT.semibold, marginBottom: 4, fontVariant: ['tabular-nums'] },
  vBar: { width: '54%', maxWidth: 26, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  vAxis: { flexDirection: 'row', marginTop: 6 },
  vAxisLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: COLORS.slate, fontFamily: FONT.medium },

  // horizontal
  hWrap: { gap: 12, paddingVertical: 4 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hLabel: { width: 84, fontSize: 12, color: COLORS.slateDark, fontFamily: FONT.medium },
  hTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.slateLight, overflow: 'hidden' },
  hFill: { height: '100%', borderRadius: 4 },
  hValue: { width: 74, textAlign: 'right', fontSize: 12, color: COLORS.slateDark, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
})
