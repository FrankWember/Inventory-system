import React from 'react'
import { View, Platform, StyleSheet, Text } from 'react-native'
import { COLORS, FONT, fmt, fmtNum } from '../utils/helpers'
import { SimpleBarChart, BarChartItem } from './SimpleBarChart'

export interface ProfessionalBarChartItem extends BarChartItem {
  revenue?: number
  unitsSold?: number
  cost?: number
  date?: string
}

interface ProfessionalBarChartProps {
  data: ProfessionalBarChartItem[]
  height?: number
  formatValue?: (n: number) => string
}

// Professional chart component that uses recharts on web and SimpleBarChart on native
export function ProfessionalBarChart({ data, height = 260, formatValue }: ProfessionalBarChartProps) {
  if (Platform.OS === 'web') {
    return <WebProfessionalChart data={data} height={height} formatValue={formatValue} />
  }

  // Fallback to SimpleBarChart on native
  return <SimpleBarChart data={data} height={height} formatValue={formatValue} />
}

// Web-only component using recharts
function WebProfessionalChart({ data, height, formatValue }: ProfessionalBarChartProps) {
  // Dynamic import for web-only recharts - wrapped in try-catch to handle bundler issues
  let Recharts
  try {
    Recharts = require('recharts')
  } catch (error) {
    console.error('Failed to load recharts:', error)
    // Fallback to SimpleBarChart if recharts fails to load
    return <SimpleBarChart data={data} height={height} formatValue={formatValue} />
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } = Recharts

  // Calculate dynamic domain for Y-axis with padding
  const calculateDomain = () => {
    if (data.length === 0) return [0, 100]

    const values = data.map(d => d.value)
    const maxValue = Math.max(...values, 0)
    const minValue = Math.min(...values, 0)

    // Calculate range and add 20% padding
    const range = maxValue - minValue
    const padding = Math.max(range * 0.2, 1) // At least 1 unit padding

    // Handle edge cases
    if (maxValue === 0 && minValue === 0) {
      return [-10, 10] // Show small range when all values are zero
    }

    if (minValue >= 0) {
      // All positive values
      return [0, Math.ceil(maxValue + padding)]
    } else if (maxValue <= 0) {
      // All negative values
      return [Math.floor(minValue - padding), 0]
    } else {
      // Mixed positive and negative
      return [Math.floor(minValue - padding), Math.ceil(maxValue + padding)]
    }
  }

  const yAxisDomain = calculateDomain()

  // Custom tooltip with detailed information
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as ProfessionalBarChartItem
      const isNegative = item.value < 0

      return (
        <View style={styles.tooltip}>
          <View style={styles.tooltipContent}>
            <Text style={styles.tooltipDate}>{item.date || item.label}</Text>

            <View style={styles.tooltipDivider} />

            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipRowLabel}>Profit net</Text>
              <Text style={[styles.tooltipRowValue, isNegative && { color: COLORS.rose }]}>
                {formatValue ? formatValue(item.value) : fmt(item.value)}
              </Text>
            </View>

            {item.revenue !== undefined && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipRowLabel}>Revenu</Text>
                <Text style={styles.tooltipRowValue}>{fmt(item.revenue)}</Text>
              </View>
            )}

            {item.unitsSold !== undefined && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipRowLabel}>Unités vendues</Text>
                <Text style={styles.tooltipRowValue}>{fmtNum(item.unitsSold)}</Text>
              </View>
            )}

            {item.cost !== undefined && (
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipRowLabel}>Coût total</Text>
                <Text style={[styles.tooltipRowValue, { color: COLORS.rose }]}>{fmt(item.cost)}</Text>
              </View>
            )}
          </View>
        </View>
      )
    }
    return null
  }

  // Custom label to show value on top of bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, height } = props
    const isNegative = value < 0

    // Calculate position based on bar orientation
    // For negative bars, position label at a fixed offset below the zero line (y position)
    // to ensure it stays visible and inside the bar regardless of bar size
    // For positive bars, position above the bar
    const labelY = isNegative
      ? y + 20  // Fixed position below the zero line for negative bars
      : y - 6   // Above the bar for positive bars
    const labelColor = isNegative ? COLORS.rose : COLORS.primary

    return (
      <text
        x={x + width / 2}
        y={labelY}
        fill={labelColor}
        textAnchor="middle"
        fontSize={11}
        fontWeight="600"
        fontFamily={FONT.semibold}
      >
        {formatValue ? formatValue(value) : value}
      </text>
    )
  }

  // Custom bar shape with rounded corners
  const RoundedBar = (props: any) => {
    const { fill, x, y, width, height } = props
    const isNegative = height < 0
    const radius = 6

    // Ensure we have valid dimensions
    if (width <= 0 || Math.abs(height) < 1) return null

    if (isNegative) {
      // Negative bar - round bottom corners
      const actualHeight = Math.abs(height)
      const actualY = y - actualHeight

      return (
        <path
          d={`
            M ${x} ${actualY}
            L ${x} ${actualY + actualHeight - radius}
            Q ${x} ${actualY + actualHeight} ${x + radius} ${actualY + actualHeight}
            L ${x + width - radius} ${actualY + actualHeight}
            Q ${x + width} ${actualY + actualHeight} ${x + width} ${actualY + actualHeight - radius}
            L ${x + width} ${actualY}
            L ${x} ${actualY}
            Z
          `}
          fill={fill}
        />
      )
    } else {
      // Positive bar - round top corners only, square bottom
      return (
        <path
          d={`
            M ${x} ${y + height}
            L ${x} ${y + radius}
            Q ${x} ${y} ${x + radius} ${y}
            L ${x + width - radius} ${y}
            Q ${x + width} ${y} ${x + width} ${y + radius}
            L ${x + width} ${y + height}
            L ${x} ${y + height}
            Z
          `}
          fill={fill}
        />
      )
    }
  }

  return (
    <View style={[{ width: '100%', height }, styles.chartWrapper]}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 25, right: 10, left: 0, bottom: 15 }}
          barCategoryGap="20%"
        >
        <defs>
          <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.95} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.8} />
            <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0.95} />
          </linearGradient>

          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke={COLORS.border}
          strokeOpacity={0.25}
          vertical={false}
        />

        <XAxis
          dataKey="label"
          tick={{
            fill: COLORS.slate,
            fontSize: 11,
            fontFamily: FONT.medium,
          }}
          axisLine={{ stroke: COLORS.border, strokeWidth: 1.5 }}
          tickLine={false}
          height={35}
          tickMargin={8}
          minTickGap={5}
          interval="preserveStartEnd"
        />

        <YAxis
          domain={yAxisDomain}
          tick={{
            fill: COLORS.slate,
            fontSize: 11,
            fontFamily: FONT.semibold,
          }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => formatValue ? formatValue(value) : value}
          width={60}
          allowDataOverflow={false}
          minTickGap={10}
          tickCount={6}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(74, 144, 226, 0.06)' }}
          wrapperStyle={{ outline: 'none' }}
        />

        <ReferenceLine
          y={0}
          stroke={COLORS.slate}
          strokeWidth={1.5}
          strokeOpacity={0.3}
          isFront={false}
        />

        <Bar
          dataKey="value"
          shape={<RoundedBar />}
          maxBarSize={52}
          filter="url(#shadow)"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.value >= 0 ? 'url(#positiveGradient)' : 'url(#negativeGradient)'}
            />
          ))}
          <LabelList
            dataKey="value"
            content={renderCustomLabel}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  chartWrapper: {
    ...Platform.select({
      web: {
        outline: 'none !important',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      } as any,
    }),
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 14,
    padding: 14,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.15)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
      },
    }),
  },
  tooltipContent: {
    gap: 8,
  },
  tooltipDate: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 2,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  tooltipRowLabel: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.slate,
  },
  tooltipRowValue: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
})
