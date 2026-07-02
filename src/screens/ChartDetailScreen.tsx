import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { SimpleBarChart, BarChartItem } from '../components/SimpleBarChart'
import { ScreenHeader } from '../components/ScreenHeader'
import { fmt, fmtNum, ThemeColors } from '../utils/helpers'

export interface ChartDetailRow {
  label: string
  value: number
  sublabel?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'ChartDetail'>

export default function ChartDetailScreen({ route, navigation }: Props) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { title, subtitle, chartData, rows, horizontal, formatValue, valueIsMoney } = route.params

  const format = (n: number) => (valueIsMoney ? fmt(n) : fmtNum(n))
  const chartFormat = formatValue ?? (n => (valueIsMoney ? fmtNum(n) : fmtNum(n)))
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        <View style={styles.chartBox}>
          <SimpleBarChart
            data={chartData}
            height={horizontal ? undefined : 220}
            horizontal={horizontal}
            formatValue={chartFormat}
          />
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total période</Text>
          <Text style={styles.totalValue}>{format(total)}</Text>
        </View>

        <Text style={styles.tableTitle}>Détail</Text>
        <View style={styles.table}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                {row.sublabel ? <Text style={styles.rowSub}>{row.sublabel}</Text> : null}
              </View>
              <Text style={styles.rowValue}>{format(row.value)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  header: {
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.slateDark, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.slate, marginTop: 4 },
  chartBox: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.white },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slateDark,
    marginBottom: 10,
  },
  table: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.slateDark },
  rowSub: { fontSize: 12, color: colors.slate, marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.primary },
})
