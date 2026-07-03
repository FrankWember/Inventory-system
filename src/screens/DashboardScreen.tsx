import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Drink, Session } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { Badge } from '../components/Badge'
import { ScreenSkeleton } from '../components/Skeleton'
import { ProfessionalBarChart } from '../components/ProfessionalBarChart'
import { FONT, fmt, fmtShort, fmtNum, today, dateLabel, formatWithCassiers, drinkRackSize } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import { LIGHT_COLORS } from '../styles/theme'
import { isWithinLastDays, isoDaysAgo } from '../utils/calculations'
import { useTranslation } from '../i18n'

const BREAKPOINT = 768

export default function DashboardScreen({ navigation }: any) {
  const { colors, theme } = useSettings()
  // "Glass" card surfaces — must follow the theme or dark mode renders
  // light-on-light text on these cards.
  const glass = theme === 'dark'
    ? { backgroundColor: 'rgba(26, 38, 56, 0.88)', borderColor: 'rgba(61, 78, 102, 0.5)' }
    : { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderColor: 'rgba(255, 255, 255, 0.5)' }
  const { t } = useTranslation()
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  const loadData = async () => {
    try {
      const { data: drinksData, error: drinksError } = await supabase
        .from('drinks')
        .select('*')
        .eq('active', true)
        .order('name')

      if (drinksError) throw drinksError

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`*, session_lines (*)`)
        .eq('closed', true)
        .gte('date', isoDaysAgo(7, today()))
        .order('date', { ascending: false })

      if (sessionsError) throw sessionsError

      setDrinks(drinksData || [])
      setSessions(sessionsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Refetch when the tab regains focus so numbers update after a session
  // closes or stock changes (RefreshControl doesn't work on web).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData)
    return unsubscribe
  }, [navigation])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ScreenHeader title={t('dashboard.title')} subtitle={dateLabel(today())} colors={colors} />
        <ScreenSkeleton variant="dashboard" />
      </View>
    )
  }

  const todayStr = today()
  // "7 derniers jours" = closed sessions dated within the last 7 calendar days
  // (not the last 7 rows, which could span weeks and included open sessions
  // whose totals are still 0).
  const last7Sessions = sessions.filter(s => s.closed && isWithinLastDays(s.date, 7, todayStr))

  const last7Revenue = last7Sessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const last7Profit = last7Sessions.reduce((sum, s) => sum + s.total_profit, 0)

  const alerts = drinks.filter(d => d.stock <= d.min_stock)
  // Sort by urgency: out of stock first, then by how far below min_stock (as percentage)
  const attention = alerts.sort((a, b) => {
    // Out of stock is most critical
    if (a.stock === 0 && b.stock !== 0) return -1
    if (b.stock === 0 && a.stock !== 0) return 1
    if (a.stock === 0 && b.stock === 0) return 0

    // For items with stock, sort by stock percentage relative to min_stock (lower is more urgent)
    const aPercent = a.stock / Math.max(1, a.min_stock)
    const bPercent = b.stock / Math.max(1, b.min_stock)
    return aPercent - bPercent
  })
  const outOfStock = attention.filter(d => d.stock === 0)
  const lowStock = attention.filter(d => d.stock > 0)

  const drinkSales = drinks.map(drink => {
    let sold = 0
    let revenue = 0
    for (const s of last7Sessions) {
      const line = s.session_lines?.find(l => l.drink_id === drink.id)
      sold += line?.sold || 0
      // Use the revenue recorded at sale time, not the current price —
      // price changes must not rewrite past revenue.
      revenue += line?.revenue || 0
    }
    return { drink, sold, revenue }
  })
  const top5 = drinkSales.filter(d => d.sold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const topMax = top5[0]?.revenue || 1

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={t('dashboard.title')} subtitle={dateLabel(todayStr)} colors={colors} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── 7-day pulse ── */}
        <View style={styles.statsRow}>
          {/* @ts-ignore - web-only className */}
          <View style={[styles.statBox, glass]} className="glass-card">
            <Text style={[styles.statLabel, { color: colors.slate }]}>{t('dashboard.revenue7d')}</Text>
            <Text style={[styles.statValue, { color: colors.slateDark }]} adjustsFontSizeToFit numberOfLines={1}>{fmt(last7Revenue)}</Text>
          </View>
          {/* @ts-ignore - web-only className */}
          <View style={[styles.statBox, glass]} className="glass-card">
            <Text style={[styles.statLabel, { color: colors.slate }]}>{t('dashboard.profit7d')}</Text>
            <Text
              style={[styles.statValue, { color: last7Profit >= 0 ? colors.primary : colors.rose }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {fmt(last7Profit)}
            </Text>
          </View>
        </View>

        {/* ── 2. What needs my attention? ── */}
        {attention.length > 0 ? (
          // @ts-ignore - web-only className
          <View style={[styles.section, glass]} className="glass-card">
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.slateDark }]}>{t('dashboard.watchlist')}</Text>
              <View style={styles.badgeRow}>
                {outOfStock.length > 0 && <Badge variant="danger">{t('dashboard.outOfStockCount', { count: outOfStock.length })}</Badge>}
                {lowStock.length > 0 && <Badge variant="warning">{t('dashboard.lowStockCount', { count: lowStock.length })}</Badge>}
              </View>
            </View>
            {attention.slice(0, 5).map(d => {
              const isOut = d.stock === 0
              const isCritical = !isOut && d.stock <= d.min_stock / 2
              const stockColor = isOut ? colors.rose : (isCritical ? colors.amber : colors.primary)
              const stockText = isOut ? t('dashboard.outOfStock') : formatWithCassiers(d.stock, d.category, drinkRackSize(d))
              return (
                <TouchableOpacity key={d.id} style={[styles.alertRow, { borderTopColor: colors.border }]} onPress={() => navigation.navigate('Inventory')} activeOpacity={0.7}>
                  <View style={[styles.alertBar, { backgroundColor: stockColor }]} />
                  <View style={styles.alertMain}>
                    <Text style={[styles.alertName, { color: colors.slateDark }]} numberOfLines={1}>{d.name}</Text>
                    <Text style={[styles.alertSub, { color: colors.slate }]}>{t('dashboard.threshold', { value: d.min_stock })} · {d.category}</Text>
                  </View>
                  <View style={styles.alertRight}>
                    <Text style={[styles.alertStock, { color: stockColor }]}>
                      {stockText}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.slate400} />
                </TouchableOpacity>
              )
            })}
            {attention.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
                <Text style={[styles.moreLink, { color: colors.primary }]}>{t('dashboard.seeOthers', { count: attention.length - 5 })}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.healthyCard, { backgroundColor: `rgba(74, 144, 226, 0.12)`, borderColor: `rgba(74, 144, 226, 0.3)`, shadowColor: colors.primary }]}>
            <View style={[styles.healthyIcon, { backgroundColor: theme === 'dark' ? 'rgba(26, 38, 56, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.healthyText, { color: theme === 'dark' ? colors.emerald : '#065F46' }]}>{t('dashboard.allHealthy')}</Text>
          </View>
        )}

        {/* ── Profit trend & Best sellers row (desktop side-by-side) ── */}
        <View style={isDesktop ? styles.dashboardRow : null}>
          {/* ── Profit trend chart ── */}
          {last7Sessions.length > 0 && (
            // @ts-ignore - web-only className
            <View style={[styles.section, isDesktop && styles.dashboardHalf, glass]} className="glass-card">
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.slateDark }]}>{t('dashboard.profitPerDay')}</Text>
                <Text style={[styles.sectionHint, { color: colors.slate }]}>{t('dashboard.last7days')}</Text>
              </View>
              <View style={styles.profitChartContainer}>
                <ProfessionalBarChart
                  data={last7Sessions.slice().reverse().map(s => {
                    const unitsSold = s.session_lines?.reduce((sum, line) => sum + line.sold, 0) || 0
                    return {
                      label: s.date.slice(-5),
                      value: s.total_profit,
                      color: s.total_profit >= 0 ? colors.primary : colors.rose,
                      revenue: s.total_revenue,
                      unitsSold: unitsSold,
                      cost: s.total_cost,
                      date: dateLabel(s.date),
                    }
                  })}
                  height={isDesktop ? 320 : 280}
                  formatValue={(n) => {
                    const thousands = Math.round(n / 1000)
                    return `${thousands.toLocaleString('fr-FR')}k`
                  }}
                />
              </View>
            </View>
          )}

          {/* ── 3. What's selling? ── */}
          {top5.length > 0 && (
            // @ts-ignore - web-only className
            <View style={[styles.section, isDesktop && styles.dashboardHalf, glass]} className="glass-card">
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.slateDark }]}>{t('dashboard.bestSellers')}</Text>
                <Text style={[styles.sectionHint, { color: colors.slate }]}>{t('dashboard.last7days')}</Text>
              </View>
              {top5.map((item, i) => (
                <View key={item.drink.id} style={[styles.topRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.topRank, { backgroundColor: 'rgba(74, 144, 226, 0.15)', color: colors.primary }]}>{i + 1}</Text>
                  <View style={styles.topMain}>
                    <Text style={[styles.topName, { color: colors.slateDark }]} numberOfLines={1}>{item.drink.name}</Text>
                    <View style={[styles.topBarTrack, { backgroundColor: colors.slateLight }]}>
                      <View style={[styles.topBarFill, { width: `${Math.max(6, (item.revenue / topMax) * 100)}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                  <View style={styles.topRight}>
                    <Text style={[styles.topRevenue, { color: colors.slateDark }]} numberOfLines={1}>{fmtShort(item.revenue)}</Text>
                    <Text style={[styles.topSold, { color: colors.slate }]}>{t('dashboard.soldCount', { count: item.sold })}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {attention.length === 0 && top5.length === 0 && (
          <View style={[styles.emptyHint, glass]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.slate} />
            <Text style={[styles.emptyHintText, { color: colors.slate }]}>
              {t('dashboard.emptyHint')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    ...Platform.select({
      web: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  dashboardRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dashboardHalf: { flex: 1, marginBottom: 0 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  statLabel: { fontSize: 11, fontFamily: FONT.semibold, letterSpacing: 0.3, textTransform: 'uppercase' },
  statValue: { fontSize: 20, fontFamily: FONT.extrabold, marginTop: 8, fontVariant: ['tabular-nums'], letterSpacing: -0.5, minHeight: 28 },
  section: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: FONT.bold, letterSpacing: -0.3 },
  sectionHint: { fontSize: 13, fontFamily: FONT.medium },
  badgeRow: { flexDirection: 'row', gap: 6 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  alertBar: { width: 4, height: 36, borderRadius: 2 },
  alertMain: { flex: 1, minWidth: 0 },
  alertName: { fontSize: 15, fontFamily: FONT.semibold },
  alertSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 3 },
  alertRight: { alignItems: 'flex-end' },
  alertStock: { fontSize: 14, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  moreLink: { fontSize: 14, fontFamily: FONT.bold, marginTop: 12 },
  healthyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
      default: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  healthyIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  healthyText: { flex: 1, fontSize: 14, fontFamily: FONT.semibold },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 14,
  },
  topRank: {
    width: 28, height: 28, borderRadius: 8,
    fontSize: 14, fontFamily: FONT.bold, textAlign: 'center', lineHeight: 28,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  topMain: { flex: 1, minWidth: 0, gap: 7 },
  topName: { fontSize: 15, fontFamily: FONT.semibold },
  topBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  topBarFill: { height: '100%', borderRadius: 3 },
  topRight: { alignItems: 'flex-end' },
  topRevenue: { fontSize: 16, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  topSold: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  emptyHintText: { flex: 1, fontSize: 14, fontFamily: FONT.regular, lineHeight: 20 },
  profitChartContainer: {
    paddingTop: 8,
    width: '100%',
  },
})
