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

// Thin wrapper over the in-house View-based chart. The previous version pulled
// in recharts on web (~225 KB gzip) and react-native-gifted-charts on native
// (blank/crashing with RN 0.81) — SimpleBarChart renders identically on both.
export function ProfessionalBarChart({ data, height = 260, formatValue }: ProfessionalBarChartProps) {
  return <SimpleBarChart data={data} height={height} formatValue={formatValue} />
}
