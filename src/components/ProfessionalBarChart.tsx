import React from 'react'
import { SimpleBarChart } from './SimpleBarChart'

export interface ProfessionalBarChartItem {
  label: string
  value: number
  color?: string
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

// Thin wrapper over the in-house SVG chart (react-native-svg, one code path
// web + native). The rich fields (revenue/unitsSold/cost/date) surface in the
// chart's tap/hover tooltip.
export function ProfessionalBarChart({ data, height = 260, formatValue }: ProfessionalBarChartProps) {
  return <SimpleBarChart data={data} height={height} formatValue={formatValue} />
}
