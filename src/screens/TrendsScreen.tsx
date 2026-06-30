import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { ScreenHeader } from '../components/ScreenHeader'
import { ExpandableChartCard } from '../components/ExpandableChartCard'
import { CategoryShare } from '../components/CategoryShare'
import { ScreenSkeleton } from '../components/Skeleton'
import { supabase } from '../lib/supabase'
import { Session, Drink } from '../types'
import { Card, CardHeader, CardContent } from '../components/Card'
import { Badge } from '../components/Badge'
import { COLORS, fmt, fmtNum, fmtShort, fmtShortBare, dateLabel, dateLabelLong, getCategoryColor } from '../utils/helpers'

const BREAKPOINT = 768

type TrendsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function TrendsScreen() {
  const navigation = useNavigation<TrendsScreenNavigationProp>()
  const [sessions, setSessions] = useState<Session[]>([])
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

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

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

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
        color: s.total_profit >= 0 ? COLORS.primary : COLORS.rose,
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
        .map(d => ({
          label: d.drink.name.length > 12 ? d.drink.name.slice(0, 11) + '…' : d.drink.name,
          value: d.revenue,
          color: COLORS.primary,
        })),
    [drinkPerformance]
  )

  const top10Chart = useMemo(
    () =>
      drinkPerformance
        .filter(d => d.revenue > 0)
        .slice(0, 10)
        .map(d => ({ label: d.drink.name, value: d.revenue, color: COLORS.primary })),
    [drinkPerformance]
  )

  const categoryMix = useMemo(() => {
    const byCat: Record<string, number> = {}
    for (const { drink, revenue } of drinkPerformance) {
      if (revenue > 0) byCat[drink.category] = (byCat[drink.category] ?? 0) + revenue
    }
    return Object.entries(byCat)
      .map(([label, value]) => ({ label, value, color: getCategoryColor(label) }))
      .sort((a, b) => b.value - a.value)
  }, [drinkPerformance])

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <ScreenHeader title="Stats" subtitle={`${period} derniers jours`} />
        <ScreenSkeleton variant="list" />
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
            <Text style={styles.kpiValue} numberOfLines={1}>
              {fmtShort(totalRevenue)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Profit</Text>
            <Text
              style={[styles.kpiValue, { color: totalProfit >= 0 ? COLORS.primary : COLORS.rose }]}
              numberOfLines={1}
            >
              {fmtShort(totalProfit)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Vendus</Text>
            <Text style={styles.kpiValue}>{fmtNum(totalUnits)}</Text>
          </View>
        </View>

        <View style={isDesktop ? styles.chartRow : null}>
          <View style={isDesktop ? styles.chartHalf : null}>
            <ExpandableChartCard
              title="Revenu par jour"
              data={revenueChartData}
              height={isDesktop ? 240 : 200}
              formatValue={fmtShortBare}
              onExpand={isDesktop ? undefined : () => navigation.navigate('ChartDetail', {
                title: 'Revenu par jour',
                subtitle: `${period} derniers jours`,
                chartData: revenueChartData,
                rows: revenueRows,
                valueIsMoney: true,
              })}
            />
          </View>

          <View style={isDesktop ? styles.chartHalf : null}>
            <ExpandableChartCard
              title="Profit par jour"
              data={profitChartData}
              height={isDesktop ? 240 : 200}
              formatValue={fmtShortBare}
              onExpand={isDesktop ? undefined : () => navigation.navigate('ChartDetail', {
                title: 'Profit par jour',
                subtitle: `${period} derniers jours`,
                chartData: profitChartData,
                rows: profitRows,
                valueIsMoney: true,
              })}
            />
          </View>
        </View>

        <ExpandableChartCard
          title="Top boissons"
          data={top5Chart}
          horizontal
          formatValue={fmtShortBare}
          onExpand={isDesktop ? undefined : () => navigation.navigate('ChartDetail', {
            title: 'Top boissons par revenu',
            subtitle: `Période ${period} jours`,
            chartData: top10Chart,
            rows: top5Rows,
            horizontal: true,
            valueIsMoney: true,
          })}
        />

        {categoryMix.length > 0 && (
          <Card>
            <CardHeader title="Par catégorie" />
            <CardContent>
              <CategoryShare data={categoryMix} />
            </CardContent>
          </Card>
        )}

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

    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  chartRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  chartHalf: { flex: 1 },
  periodSelector: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.slate },
  periodButtonTextActive: { color: COLORS.white },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  kpiLabel: { fontSize: 12, color: COLORS.slate, fontWeight: '600', textTransform: 'uppercase' },
  kpiValue: { fontSize: 20, fontWeight: '700', color: COLORS.slateDark, marginTop: 6 },
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
