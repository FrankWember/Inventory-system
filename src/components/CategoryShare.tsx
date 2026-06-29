import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, FONT, fmt } from '../utils/helpers'

export interface ShareSlice {
  label: string
  value: number
  color: string
}

// Minimal category-mix viz: one segmented bar + a compact legend. Pure Views,
// cross-platform, far less visual noise than a multi-colour donut.
export function CategoryShare({ data }: { data: ShareSlice[] }) {
  const slices = data.filter(d => d.value > 0)
  if (slices.length === 0) return <Text style={styles.empty}>Aucune donnée</Text>
  const total = slices.reduce((s, d) => s + d.value, 0)

  return (
    <View>
      <View style={styles.bar}>
        {slices.map((s, i) => (
          <View key={i} style={{ flex: s.value, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
            <Text style={styles.value}>{fmt(s.value)}</Text>
            <Text style={styles.pct}>{Math.round((s.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: COLORS.slate, textAlign: 'center', padding: 16, fontFamily: FONT.medium },
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: COLORS.slateLight,
  },
  legend: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 3 },
  label: { flex: 1, fontSize: 13, color: COLORS.slateDark, fontFamily: FONT.medium },
  value: { fontSize: 13, color: COLORS.slate, fontFamily: FONT.medium, fontVariant: ['tabular-nums'] },
  pct: { width: 40, textAlign: 'right', fontSize: 13, color: COLORS.slateDark, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
})
