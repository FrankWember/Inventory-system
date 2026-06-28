import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { ScreenHeader } from '../components/ScreenHeader'
import { ExpandableChartCard } from '../components/ExpandableChartCard'
import { ChartDetailModal } from '../components/ChartDetailModal'
import { supabase } from '../lib/supabase'
import { Session, Drink } from '../types'
import { Card, CardHeader, CardContent } from '../components/Card'
import { Badge } from '../components/Badge'
import { COLORS, fmt, fmtNum, dateLabel, dateLabelLong } from '../utils/helpers'

type ChartKey = 'revenue' | 'profit' | 'top5' | null

export default function TrendsScreen() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const [expandedChart, setExpandedChart] = useState<ChartKey>(null)

  const loadData = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`*, session_lines (*)`)
        .eq('closed', true)
        .order('date', { ascending: false })
        .limit(period)

      if (sessionsError) throw sessionsError

      const { data: drinksData, error: drinksError } = await supabase
        .from('drinks')
        .select('*')
        .eq('active', true)

      if (drinksError) throw drinksError

      setSessions(sessionsData || [])
      setDrinks(drinksData || [])
    } catch (error) {
      console.error('Error loading trends:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period])

  const closedSessions = useMemo(
    () => [...sessions].filter(s => s.closed).sort((a, b) => a.date.localeCompare(b.date)),
    [sessions]
  )

  const chartSessions = useMemo(() => closedSessions.slice(-Math.min(period, 14)), [closedSessions, period])

  const revenueChartData = useMemo(
    () =>
      chartSessions.map(s => ({
        label: dateLabel(s.date).split(' ').slice(0, 2).join(' '),
        value: s.total_revenue,
        color: COLORS.primary,
      })),
    [chartSessions]
  )

  const profitChartData = useMemo(
    () =>
      chartSessions.map(s => ({
        label: dateLabel(s.date).split(' ').slice(0, 2).join(' '),
        value: s.total_profit,
        color: s.total_profit >= 0 ? COLORS.emerald : COLORS.rose,
      })),
    [chartSessions]
  )

  const drinkPerformance = useMemo(() => {
    return drinks
      .map(drink => {
        const sold = closedSessions.reduce((sum, s) => {
          const line = s.session_lines?.find(l => l.drink_id === drink.id)
          return sum + (line?.sold || 0)
        }, 0)
        const revenue = sold * drink.price
        const avgDaily = sold / Math.max(1, closedSessions.length)
        const rotation = avgDaily >= 8 ? 'Fort' : avgDaily >= 3 ? 'Moyen' : 'Lent'
        return { drink, sold, revenue, avgDaily, rotation }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [drinks, closedSessions])

  const top5Chart = useMemo(
    () =>
      drinkPerformance
        .filter(d => d.revenue > 0)
        .slice(0, 5)
        .map((d, i) => ({
          label: d.drink.name.length > 12 ? d.drink.name.slice(0, 11) + '…' : d.drink.name,
          value: d.revenue,
          color: [COLORS.primary, COLORS.sky, COLORS.emerald, COLORS.amber, '#6B7280'][i],
        })),
    [drinkPerformance]
  )

  const top10Chart = useMemo(
    () =>
      drinkPerformance
        .filter(d => d.revenue > 0)
        .slice(0, 10)
        .map((d, i) => ({
          label: d.drink.name,
          value: d.revenue,
          color: [COLORS.primary, COLORS.sky, COLORS.emerald, COLORS.amber, '#6B7280'][i % 5],
        })),
    [drinkPerformance]
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const totalRevenue = closedSessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalProfit = closedSessions.reduce((sum, s) => sum + s.total_profit, 0)
  const totalUnits = closedSessions.reduce(
    (sum, s) => sum + (s.session_lines?.reduce((ls, l) => ls + l.sold, 0) || 0),
    0
  )

  const revenueRows = chartSessions.map(s => ({
    label: dateLabelLong(s.date),
    value: s.total_revenue,
    sublabel: `${fmtNum(s.session_lines?.reduce((a, l) => a + l.sold, 0) || 0)} unités vendues`,
  }))

  const profitRows = chartSessions.map(s => ({
    label: dateLabelLong(s.date),
    value: s.total_profit,
    sublabel: `Revenu ${fmt(s.total_revenue)}`,
  }))

  const top5Rows = drinkPerformance
    .filter(d => d.revenue > 0)
    .slice(0, 10)
    .map(d => ({
      label: d.drink.name,
      value: d.revenue,
      sublabel: `${fmtNum(d.sold)} vendus · ${d.avgDaily.toFixed(1)}/jour`,
    }))

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Stats" subtitle={`${period} derniers jours`} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} />}
      >
        <View style={styles.periodSelector}>
          {[7, 30, 90].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p as 7 | 30 | 90)}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>{p}j</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Revenu</Text>
            <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {fmt(totalRevenue)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Profit</Text>
            <Text
              style={[styles.kpiValue, { color: COLORS.emerald }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {fmt(totalProfit)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Vendus</Text>
            <Text style={styles.kpiValue}>{fmtNum(totalUnits)}</Text>
          </View>
        </View>

        <ExpandableChartCard
          title="Revenu par jour"
          subtitle={`${chartSessions.length} journées`}
          data={revenueChartData}
          height={150}
          onExpand={() => setExpandedChart('revenue')}
        />

        <ExpandableChartCard
          title="Profit par jour"
          data={profitChartData}
          height={130}
          onExpand={() => setExpandedChart('profit')}
        />

        <ExpandableChartCard
          title="Top boissons"
          subtitle="Par revenu"
          data={top5Chart}
          horizontal
          onExpand={() => setExpandedChart('top5')}
        />

        <Card>
          <CardHeader title="Détail par boisson" />
          <CardContent>
            {drinkPerformance.slice(0, 15).map((item, i) => (
              <View key={item.drink.id} style={styles.performanceItem}>
                <Text style={styles.performanceNumber}>{i + 1}</Text>
                <View style={styles.performanceInfo}>
                  <Text style={styles.performanceName} numberOfLines={1}>{item.drink.name}</Text>
                  <Text style={styles.performanceDetails}>
                    {fmtNum(item.sold)} unités · {item.avgDaily.toFixed(1)}/jour
                  </Text>
                </View>
                <View style={styles.performanceRight}>
                  <Badge variant={item.rotation === 'Fort' ? 'success' : item.rotation === 'Moyen' ? 'warning' : 'default'}>
                    {item.rotation}
                  </Badge>
                  <Text style={styles.performanceRevenue}>{fmt(item.revenue)}</Text>
                </View>
              </View>
            ))}
            {drinkPerformance.length === 0 && (
              <Text style={styles.empty}>Clôturez des sessions pour voir les stats</Text>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      <ChartDetailModal
        visible={expandedChart === 'revenue'}
        onClose={() => setExpandedChart(null)}
        title="Revenu par jour"
        subtitle={`${period} derniers jours`}
        chartData={revenueChartData}
        rows={revenueRows}
      />

      <ChartDetailModal
        visible={expandedChart === 'profit'}
        onClose={() => setExpandedChart(null)}
        title="Profit par jour"
        subtitle={`${period} derniers jours`}
        chartData={profitChartData}
        rows={profitRows}
      />

      <ChartDetailModal
        visible={expandedChart === 'top5'}
        onClose={() => setExpandedChart(null)}
        title="Top boissons par revenu"
        subtitle={`Période ${period} jours`}
        chartData={top10Chart}
        rows={top5Rows}
        horizontal
        valueIsMoney
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  periodSelector: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.slate },
  periodButtonTextActive: { color: COLORS.white },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: { fontSize: 11, color: COLORS.slate, fontWeight: '600' },
  kpiValue: { fontSize: 13, fontWeight: '700', color: COLORS.slateDark, marginTop: 4 },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  performanceNumber: { width: 22, fontSize: 14, fontWeight: '700', color: COLORS.slate },
  performanceInfo: { flex: 1 },
  performanceName: { fontSize: 14, fontWeight: '600', color: COLORS.slateDark },
  performanceDetails: { fontSize: 12, color: COLORS.slate, marginTop: 2 },
  performanceRight: { alignItems: 'flex-end', gap: 4 },
  performanceRevenue: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  empty: { fontSize: 13, color: COLORS.slate, textAlign: 'center', padding: 12 },
})
