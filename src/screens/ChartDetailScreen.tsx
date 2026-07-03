import React, { useEffect } from 'react'
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
import { fmt, fmtNum } from '../utils/helpers'
import { LIGHT_COLORS } from '../styles/theme'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'

export interface ChartDetailRow {
  label: string
  value: number
  sublabel?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'ChartDetail'>

export default function ChartDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation()
  const { colors } = useSettings()
  // This screen only makes sense with params passed in-app. On web, /chart-detail
  // is a routable URL: a page refresh or direct visit lands here with no params —
  // destructuring them blindly used to crash to a white screen. Redirect home.
  const params = route.params
  const hasData = !!params?.chartData && !!params?.rows

  useEffect(() => {
    if (!hasData) {
      // @ts-ignore — MainTabs takes no params
      navigation.replace('MainTabs')
    }
  }, [hasData, navigation])

  if (!hasData) return null

  const { title, subtitle, chartData, rows, horizontal, formatValue, valueIsMoney } = params

  const format = (n: number) => (valueIsMoney ? fmt(n) : fmtNum(n))
  const chartFormat = formatValue ?? (n => (valueIsMoney ? fmtNum(n) : fmtNum(n)))
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
        colors={colors}
      />
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        <View style={[styles.chartBox, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <SimpleBarChart
            data={chartData}
            height={horizontal ? undefined : 220}
            horizontal={horizontal}
            formatValue={chartFormat}
          />
        </View>

        <View style={[styles.totalRow, { backgroundColor: colors.primary }]}>
          <Text style={styles.totalLabel}>{t('stats.totalPeriod')}</Text>
          <Text style={[styles.totalValue, { color: colors.white }]}>{format(total)}</Text>
        </View>

        <Text style={[styles.tableTitle, { color: colors.slateDark }]}>{t('stats.detail')}</Text>
        <View style={[styles.table, { backgroundColor: colors.white, borderColor: colors.border }]}>
          {rows.map((row, i) => (
            <View key={i} style={[styles.row, { borderBottomColor: colors.border }, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Text style={[styles.rowLabel, { color: colors.slateDark }]}>{row.label}</Text>
                {row.sublabel ? <Text style={[styles.rowSub, { color: colors.slate }]}>{row.sublabel}</Text> : null}
              </View>
              <Text style={[styles.rowValue, { color: colors.primary }]}>{format(row.value)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  header: {
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 4 },
  chartBox: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '700' },
})
