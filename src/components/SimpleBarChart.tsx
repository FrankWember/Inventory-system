import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native'
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { FONT, fmt, fmtNum } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'

export interface BarChartItem {
  label: string
  value: number
  color?: string
  // Optional details shown in the tap/hover tooltip
  revenue?: number
  unitsSold?: number
  cost?: number
  date?: string
}

interface SimpleBarChartProps {
  data: BarChartItem[]
  height?: number
  formatValue?: (n: number) => string
  horizontal?: boolean
  /** Tooltip values are money (FCFA). Every current chart is money, hence the default. */
  money?: boolean
}

// SVG-based charts (react-native-svg renders to DOM <svg> on web, native views
// on iOS/Android — one code path, no heavyweight chart lib). Full-featured
// alternatives were evaluated and rejected for this stack: recharts (~225 KB
// gzip, web-only), gifted-charts (crashed on RN 0.81), victory-native-xl
// (Skia: no web support, 2.9 MB wasm).

// "Nice numbers" axis: pick a step of 1/2/5 × 10^k so tick values are round.
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / pow
  const mult = norm > 5 ? 10 : norm > 2 ? 5 : norm > 1 ? 2 : 1
  return mult * pow
}

function buildTicks(min: number, max: number, targetCount = 4): number[] {
  if (min === 0 && max === 0) max = 1
  const step = niceStep((max - min) / targetCount || 1)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  // Epsilon guards float drift so the last tick isn't dropped
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-6 ? 0 : v)
  return ticks
}

// Bar with only its outer end rounded (top for positive, bottom for negative).
function barPath(x: number, y: number, w: number, h: number, negative: boolean): string {
  const r = Math.min(4, w / 2, h)
  if (h <= 0) return ''
  if (!negative) {
    // y = top of bar, anchored at y + h (zero line)
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
  }
  // y = zero line, bar extends down to y + h
  return `M${x},${y} L${x + w},${y} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} Z`
}

export function SimpleBarChart({
  data,
  height = 200,
  formatValue = fmtNum,
  horizontal = false,
  money = true,
}: SimpleBarChartProps) {
  const { t } = useTranslation()
  const { colors } = useSettings()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))

  const empty = data.length === 0

  const geom = useMemo(() => {
    if (empty || horizontal || width === 0) return null
    const values = data.map(d => d.value)
    const ticks = buildTicks(Math.min(0, ...values), Math.max(0, ...values))
    const dMin = ticks[0]
    const dMax = ticks[ticks.length - 1]

    const tickLabels = ticks.map(formatValue)
    const gutter = Math.min(64, Math.max(28, Math.max(...tickLabels.map(s => s.length)) * 6.2 + 10))
    const mTop = 18 // room for value labels above the tallest bar
    const mBottom = 20 // x-axis labels
    const plotW = width - gutter - 8
    const plotH = height - mTop - mBottom
    const y = (v: number) => mTop + ((dMax - v) / (dMax - dMin)) * plotH

    const n = data.length
    const slot = plotW / n
    const barW = Math.min(28, Math.max(6, slot * 0.55))
    const showEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 48))))
    const showValues = slot >= 36

    const bars = data.map((d, i) => {
      const negative = d.value < 0
      const yZero = y(0)
      const yVal = y(d.value)
      const h = d.value === 0 ? 0 : Math.max(2, Math.abs(yZero - yVal))
      return {
        x: gutter + i * slot + (slot - barW) / 2,
        yTop: negative ? yZero : yZero - h,
        h,
        negative,
        cx: gutter + i * slot + slot / 2,
      }
    })

    return { ticks, gutter, plotW, plotH, mTop, mBottom, y, slot, barW, bars, showEvery, showValues }
  }, [data, empty, horizontal, width, height, formatValue])

  if (empty) {
    return <Text style={[styles.empty, { color: colors.slate }]}>{t('common.noData')}</Text>
  }

  // ── Horizontal: label + track rows (Views are the cleanest fit here) ──
  if (horizontal) {
    const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1)
    const hasNegative = data.some(d => d.value < 0)
    return (
      <View style={styles.hWrap}>
        {data.map((d, i) => {
          const negative = d.value < 0
          const pct = Math.max(2, (Math.abs(d.value) / maxAbs) * 100)
          const fill = d.color ?? (negative ? colors.rose : colors.primary)
          return (
            <View key={i} style={styles.hRow}>
              <Text style={[styles.hLabel, { color: colors.slateDark }]} numberOfLines={1}>{d.label}</Text>
              {hasNegative ? (
                <View style={styles.hSplitTrack}>
                  <View style={styles.hHalf}>
                    {negative && <View style={[styles.hFillNeg, { width: `${pct}%`, backgroundColor: fill }]} />}
                  </View>
                  <View style={[styles.hAxis, { backgroundColor: colors.borderStrong }]} />
                  <View style={[styles.hHalf, { justifyContent: 'flex-start' }]}>
                    {!negative && <View style={[styles.hFillPos, { width: `${pct}%`, backgroundColor: fill }]} />}
                  </View>
                </View>
              ) : (
                <View style={[styles.hTrack, { backgroundColor: colors.slateLight }]}>
                  <View style={[styles.hFill, { width: `${pct}%`, backgroundColor: fill }]} />
                </View>
              )}
              <Text
                style={[styles.hValue, { color: negative ? colors.rose : colors.slateDark }]}
                numberOfLines={1}
              >
                {formatValue(d.value)}
              </Text>
            </View>
          )
        })}
      </View>
    )
  }

  // ── Vertical: SVG plot with axis, gridlines, rounded bars, tooltip ──
  // A stale index can outlive a data change (e.g. period switch) — treat it as no selection.
  const activeIdx = active !== null && active < data.length ? active : null
  const activeItem = activeIdx !== null ? data[activeIdx] : null
  const tooltipMain = (n: number) => (money ? fmt(n) : fmtNum(n))
  const tooltipW = 168
  const tooltipLeft =
    geom && activeIdx !== null
      ? Math.min(Math.max(4, geom.bars[activeIdx].cx - tooltipW / 2), width - tooltipW - 4)
      : 0

  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      {geom && (
        <>
          <Svg width={width} height={height}>
            {/* Gridlines + y tick labels */}
            {geom.ticks.map((tick, i) => {
              const ty = geom.y(tick)
              return (
                <React.Fragment key={i}>
                  <Line
                    x1={geom.gutter}
                    x2={width - 8}
                    y1={ty}
                    y2={ty}
                    stroke={tick === 0 ? colors.borderStrong : colors.border}
                    strokeWidth={1}
                    strokeDasharray={tick === 0 ? undefined : '3 4'}
                  />
                  <SvgText
                    x={geom.gutter - 6}
                    y={ty + 3}
                    fontSize={10}
                    fontFamily={FONT.medium}
                    fill={colors.slate}
                    textAnchor="end"
                  >
                    {formatValue(tick)}
                  </SvgText>
                </React.Fragment>
              )
            })}

            {/* Active column highlight */}
            {activeIdx !== null && (
              <Rect
                x={geom.gutter + activeIdx * geom.slot}
                y={geom.mTop}
                width={geom.slot}
                height={geom.plotH}
                fill={colors.slateLight}
                opacity={0.5}
              />
            )}

            {/* Bars */}
            {data.map((d, i) => {
              const b = geom.bars[i]
              if (b.h === 0) return null
              return (
                <Path
                  key={i}
                  d={barPath(b.x, b.yTop, geom.barW, b.h, b.negative)}
                  fill={d.color ?? (b.negative ? colors.rose : colors.primary)}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.45}
                />
              )
            })}

            {/* Value labels (only when they have room) */}
            {geom.showValues &&
              data.map((d, i) => {
                if (d.value === 0) return null
                const b = geom.bars[i]
                return (
                  <SvgText
                    key={i}
                    x={b.cx}
                    y={b.negative ? b.yTop + b.h + 12 : b.yTop - 5}
                    fontSize={10}
                    fontFamily={FONT.semibold}
                    fill={b.negative ? colors.rose : colors.slate}
                    textAnchor="middle"
                  >
                    {formatValue(d.value)}
                  </SvgText>
                )
              })}

            {/* X-axis labels, thinned when crowded */}
            {data.map((d, i) =>
              i % geom.showEvery === 0 ? (
                <SvgText
                  key={i}
                  x={geom.bars[i].cx}
                  y={height - 5}
                  fontSize={10}
                  fontFamily={FONT.medium}
                  fill={colors.slate}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null
            )}
          </Svg>

          {/* Hit areas: one pressable column per bar (tap toggles, hover on web) */}
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', marginLeft: geom.gutter, marginRight: 8 }]}>
            {data.map((_, i) => (
              <Pressable
                key={i}
                style={{ flex: 1 }}
                onPress={() => setActive(prev => (prev === i ? null : i))}
                {...(Platform.OS === 'web'
                  ? { onHoverIn: () => setActive(i), onHoverOut: () => setActive(null) }
                  : {})}
              />
            ))}
          </View>

          {/* Tooltip */}
          {activeItem && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  left: tooltipLeft,
                  width: tooltipW,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: '#000',
                },
              ]}
            >
              <Text style={[styles.tooltipTitle, { color: colors.slate }]} numberOfLines={1}>
                {activeItem.date ?? activeItem.label}
              </Text>
              <Text
                style={[
                  styles.tooltipValue,
                  { color: activeItem.value < 0 ? colors.rose : colors.slateDark },
                ]}
                numberOfLines={1}
              >
                {tooltipMain(activeItem.value)}
              </Text>
              {activeItem.revenue !== undefined && (
                <TooltipRow label={t('stats.revenue')} value={fmt(activeItem.revenue)} colors={colors} />
              )}
              {activeItem.cost !== undefined && (
                <TooltipRow label={t('stats.costLabel')} value={fmt(activeItem.cost)} colors={colors} />
              )}
              {activeItem.unitsSold !== undefined && (
                <TooltipRow label={t('stats.soldLabel')} value={fmtNum(activeItem.unitsSold)} colors={colors} />
              )}
            </View>
          )}
        </>
      )}
    </View>
  )
}

function TooltipRow({
  label,
  value,
  colors,
}: {
  label: string
  value: string
  colors: { slate: string; slateDark: string }
}) {
  return (
    <View style={styles.tooltipRow}>
      <Text style={[styles.tooltipRowLabel, { color: colors.slate }]}>{label}</Text>
      <Text style={[styles.tooltipRowValue, { color: colors.slateDark }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, textAlign: 'center', padding: 16, fontFamily: FONT.medium },

  // horizontal
  hWrap: { gap: 12, paddingVertical: 4 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hLabel: { width: 84, fontSize: 12, fontFamily: FONT.medium },
  hTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  hFill: {
    height: '100%',
    borderRadius: 5,
    ...Platform.select({ web: { transition: 'width 0.4s ease' } as object }),
  },
  hSplitTrack: { flex: 1, height: 10, flexDirection: 'row', alignItems: 'center' },
  hHalf: { flex: 1, height: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  hAxis: { width: 2, height: 14 },
  hFillNeg: { height: '100%', borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  hFillPos: { height: '100%', borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  hValue: { width: 74, textAlign: 'right', fontSize: 12, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },

  // tooltip
  tooltip: {
    position: 'absolute',
    top: 2,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  tooltipTitle: { fontSize: 11, fontFamily: FONT.medium },
  tooltipValue: { fontSize: 15, fontFamily: FONT.bold, fontVariant: ['tabular-nums'], marginTop: 1 },
  tooltipRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tooltipRowLabel: { fontSize: 11, fontFamily: FONT.medium },
  tooltipRowValue: { fontSize: 11, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
})
