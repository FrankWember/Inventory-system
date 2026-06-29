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
import { COLORS, FONT, fmt, fmtShort, today, dateLabel, formatWithCassiers } from '../utils/helpers'

const BREAKPOINT = 768

export default function DashboardScreen({ navigation }: any) {
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
        .order('date', { ascending: false })
        .limit(14)

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
      <View style={styles.container}>
        <ScreenHeader title="Accueil" subtitle={dateLabel(today())} />
        <ScreenSkeleton variant="dashboard" />
      </View>
    )
  }

  const todayStr = today()
  const todaySession = sessions.find(s => s.date === todayStr && s.closed)
  const last7Sessions = sessions.slice(0, 7)

  const last7Revenue = last7Sessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const last7Profit = last7Sessions.reduce((sum, s) => sum + s.total_profit, 0)
  const last7Margin = last7Revenue > 0 ? (last7Profit / last7Revenue) * 100 : 0

  const alerts = drinks.filter(d => d.stock <= d.min_stock)
  const outOfStock = alerts.filter(d => d.stock === 0)
  const lowStock = alerts.filter(d => d.stock > 0)
  // Ruptures first (money-blocking), then low stock — most urgent at the top.
  const attention = [...outOfStock, ...lowStock]

  const drinkSales = drinks.map(drink => {
    const sold = last7Sessions.reduce((sum, s) => {
      const line = s.session_lines?.find(l => l.drink_id === drink.id)
      return sum + (line?.sold || 0)
    }, 0)
    return { drink, sold, revenue: sold * drink.price }
  })
  const top5 = drinkSales.filter(d => d.sold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const topMax = top5[0]?.revenue || 1

  return (
    <View style={styles.container}>
      <ScreenHeader title="Accueil" subtitle={dateLabel(todayStr)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── 7-day pulse ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Revenu 7j</Text>
            <Text style={styles.statValue} numberOfLines={1}>{fmtShort(last7Revenue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Profit 7j</Text>
            <Text
              style={[styles.statValue, { color: last7Profit >= 0 ? COLORS.primary : COLORS.rose }]}
              numberOfLines={1}
            >
              {fmtShort(last7Profit)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Marge 7j</Text>
            <Text style={[styles.statValue, { color: last7Margin >= 0 ? COLORS.primary : COLORS.rose }]}>
              {last7Margin.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* ── 2. What needs my attention? ── */}
        {attention.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>À surveiller</Text>
              <View style={styles.badgeRow}>
                {outOfStock.length > 0 && <Badge variant="danger">{outOfStock.length} rupture</Badge>}
                {lowStock.length > 0 && <Badge variant="warning">{lowStock.length} bas</Badge>}
              </View>
            </View>
            {attention.slice(0, 5).map(d => {
              const isOut = d.stock === 0
              return (
                <TouchableOpacity key={d.id} style={styles.alertRow} onPress={() => navigation.navigate('Inventory')} activeOpacity={0.7}>
                  <View style={[styles.alertBar, { backgroundColor: isOut ? COLORS.rose : COLORS.primary }]} />
                  <View style={styles.alertMain}>
                    <Text style={styles.alertName} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.alertSub}>Seuil {d.min_stock} · {d.category}</Text>
                  </View>
                  <View style={styles.alertRight}>
                    <Text style={[styles.alertStock, { color: isOut ? COLORS.rose : COLORS.primary }]}>
                      {isOut ? 'Rupture' : formatWithCassiers(d.stock, d.category)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.slate400} />
                </TouchableOpacity>
              )
            })}
            {attention.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
                <Text style={styles.moreLink}>Voir les {attention.length - 5} autres →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.healthyCard}>
            <View style={styles.healthyIcon}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.healthyText}>Tout le stock est au-dessus du seuil.</Text>
          </View>
        )}

        {/* ── 3. What's selling? ── */}
        {top5.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meilleures ventes</Text>
              <Text style={styles.sectionHint}>7 derniers jours</Text>
            </View>
            {top5.map((item, i) => (
              <View key={item.drink.id} style={styles.topRow}>
                <Text style={styles.topRank}>{i + 1}</Text>
                <View style={styles.topMain}>
                  <Text style={styles.topName} numberOfLines={1}>{item.drink.name}</Text>
                  <View style={styles.topBarTrack}>
                    <View style={[styles.topBarFill, { width: `${Math.max(6, (item.revenue / topMax) * 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.topRight}>
                  <Text style={styles.topRevenue} numberOfLines={1}>{fmtShort(item.revenue)}</Text>
                  <Text style={styles.topSold}>{item.sold} vendus</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {attention.length === 0 && top5.length === 0 && (
          <View style={styles.emptyHint}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.slate} />
            <Text style={styles.emptyHintText}>
              Clôturez une session pour voir les tendances de vente.
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
    backgroundColor: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
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
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
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
  statLabel: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.slate, letterSpacing: 0.3, textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontFamily: FONT.extrabold, color: COLORS.slateDark, marginTop: 8, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: FONT.bold, color: COLORS.slateDark, letterSpacing: -0.3 },
  sectionHint: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.slate },
  badgeRow: { flexDirection: 'row', gap: 6 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  alertBar: { width: 4, height: 36, borderRadius: 2 },
  alertMain: { flex: 1, minWidth: 0 },
  alertName: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.slateDark },
  alertSub: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 3 },
  alertRight: { alignItems: 'flex-end' },
  alertStock: { fontSize: 14, fontFamily: FONT.bold, fontVariant: ['tabular-nums'] },
  moreLink: { fontSize: 14, fontFamily: FONT.bold, color: COLORS.primary, marginTop: 12 },
  healthyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  healthyIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  healthyText: { flex: 1, fontSize: 14, fontFamily: FONT.semibold, color: '#065F46' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 14,
  },
  topRank: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primarySoft, color: COLORS.primary,
    fontSize: 14, fontFamily: FONT.bold, textAlign: 'center', lineHeight: 28,
  },
  topMain: { flex: 1, minWidth: 0, gap: 7 },
  topName: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.slateDark },
  topBarTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.slateLight, overflow: 'hidden' },
  topBarFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  topRight: { alignItems: 'flex-end' },
  topRevenue: { fontSize: 16, fontFamily: FONT.bold, color: COLORS.slateDark, fontVariant: ['tabular-nums'] },
  topSold: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 2 },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyHintText: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate, lineHeight: 20 },
})
