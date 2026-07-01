import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
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

  // Calculate values with improved scaling
  const values = data.map(d => d.value)
  const maxVal = Math.max(...values, 0)
  const minVal = Math.min(...values, 0)
  const hasNegative = minVal < 0
  const range = maxVal - minVal

  // Add 15% padding to max value for better visualization
  const padding = Math.max(range * 0.15, 1) // At least 1 unit padding
  const paddedMaxVal = maxVal + padding
  const paddedMinVal = minVal - padding

  // Calculate max with padding for proportional scaling
  const max = Math.max(Math.abs(paddedMaxVal), Math.abs(paddedMinVal), 1)

  if (horizontal) {
    // For horizontal charts, show negative bars extending left from center
    if (hasNegative) {
      return (
        <View style={styles.hWrap}>
          {data.map((d, i) => {
            const isNegative = d.value < 0
            const percent = Math.max(2, (Math.abs(d.value) / max) * 100)
            return (
              <View key={i} style={styles.hRow}>
                <Text style={styles.hLabel} numberOfLines={1}>{d.label}</Text>
                <View style={styles.hBidirectionalTrack}>
                  {isNegative ? (
                    <View style={styles.hNegativeSide}>
                      <View
                        style={[
                          styles.hFillNegative,
                          { width: `${percent}%`, backgroundColor: d.color ?? COLORS.rose },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={styles.hNegativeSide} />
                  )}
                  <View style={styles.hAxisLine} />
                  {!isNegative ? (
                    <View style={styles.hPositiveSide}>
                      <View
                        style={[
                          styles.hFillPositive,
                          { width: `${percent}%`, backgroundColor: d.color ?? COLORS.primary },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={styles.hPositiveSide} />
                  )}
                </View>
                <Text style={[styles.hValue, isNegative && { color: COLORS.rose }]} numberOfLines={1}>{formatValue(d.value)}</Text>
              </View>
            )
          })}
        </View>
      )
    }

    // Standard horizontal chart for all positive values
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

  // Vertical chart with negative support
  const plot = height - 38 // room for value + axis labels

  if (hasNegative) {
    // Each half gets equal space
    const halfPlot = plot / 2
    // Use padded max for better proportions
    const maxForScale = Math.max(Math.abs(paddedMaxVal), Math.abs(paddedMinVal), 1)

    return (
      <View style={[styles.vWrap, { height }]}>
        <View style={[styles.vPlot, { height: plot }]}>
          {data.map((d, i) => {
            const isNegative = d.value < 0
            const barHeight = Math.max(4, (Math.abs(d.value) / maxForScale) * halfPlot)
            const barColor = d.color ?? (isNegative ? COLORS.rose : COLORS.primary)

            return (
              <View key={i} style={[styles.vCol, { justifyContent: 'center' }]}>
                {/* Positive value area */}
                <View style={{ height: halfPlot, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {!isNegative && d.value !== 0 && (
                    <>
                      <Text style={styles.vValue} numberOfLines={1}>{formatValue(d.value)}</Text>
                      <View style={styles.vValueSpacer} />
                      <View style={[styles.vBarUp, { height: barHeight, backgroundColor: barColor }]} />
                    </>
                  )}
                </View>

                {/* Zero line */}
                <View style={styles.vZeroLine} />

                {/* Negative value area */}
                <View style={{ height: halfPlot, justifyContent: 'flex-start', alignItems: 'center' }}>
                  {isNegative && (
                    <>
                      <View style={[styles.vBarDown, { height: barHeight, backgroundColor: barColor }]} />
                      <View style={styles.vValueSpacer} />
                      <Text style={[styles.vValue, { color: COLORS.rose }]} numberOfLines={1}>{formatValue(d.value)}</Text>
                    </>
                  )}
                </View>
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

  // Standard vertical chart for all positive values
  // Use padded max for better proportions
  const maxForScale = paddedMaxVal || 1

  return (
    <View style={[styles.vWrap, { height }]}>
      <View style={[styles.vPlot, { height: plot, alignItems: 'flex-end' }]}>
        {data.map((d, i) => {
          const h = Math.max(3, (Math.abs(d.value) / maxForScale) * plot)
          return (
            <View key={i} style={[styles.vCol, { justifyContent: 'flex-end' }]}>
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
  vPlot: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  vCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vValue: { fontSize: 10, color: COLORS.slate, fontFamily: FONT.semibold, marginBottom: 4, fontVariant: ['tabular-nums'] },
  vBar: {
    width: 24,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
      },
    }),
  },
  vBarUp: {
    width: 24,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
      },
    }),
  },
  vBarDown: {
    width: 24,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
      },
    }),
  },
  vZeroLine: { width: '100%', height: 2, backgroundColor: COLORS.border },
  vValueSpacer: { height: 4 },
  vAxis: { flexDirection: 'row', marginTop: 6 },
  vAxisLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: COLORS.slate, fontFamily: FONT.medium },

  // horizontal
  hWrap: { gap: 12, paddingVertical: 4 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hLabel: { width: 84, fontSize: 12, color: COLORS.slateDark, fontFamily: FONT.medium },
  hTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.slateLight,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
      },
    }),
  },
  hFill: {
    height: '100%',
    borderRadius: 4,
    ...Platform.select({
      web: {
        transition: 'width 0.4s ease',
      },
    }),
  },
  hBidirectionalTrack: { flex: 1, height: 8, flexDirection: 'row', alignItems: 'center' },
  hNegativeSide: { flex: 1, height: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  hPositiveSide: { flex: 1, height: 8, flexDirection: 'row', justifyContent: 'flex-start' },
  hFillNegative: { height: '100%', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  hFillPositive: { height: '100%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  hAxisLine: { width: 2, height: 12, backgroundColor: COLORS.border },
  hValue: { width: 74, textAlign: 'right', fontSize: 12, color: COLORS.slateDark, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
})
