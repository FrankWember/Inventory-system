import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { Drink, Session } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { Badge } from '../components/Badge'
import { ScreenSkeleton } from '../components/Skeleton'
import { COLORS, FONT, fmt, fmtShort, today, dateLabel, formatWithCassiers } from '../utils/helpers'

export default function DashboardScreen({ navigation }: any) {
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
  const todayOpen = sessions.find(s => s.date === todayStr && !s.closed)
  const last7Sessions = sessions.slice(0, 7)

  const todayRevenue = todaySession?.total_revenue || 0
  const todayProfit = todaySession?.total_profit || 0
  const todayMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0
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

  // Session call-to-action reflects today's state.
  const cta = todayOpen
    ? { label: 'Continuer la session', icon: 'arrow-forward-circle' as const, primary: true }
    : todaySession
    ? { label: 'Voir la journée', icon: 'document-text' as const, primary: false }
    : { label: 'Démarrer la session', icon: 'add-circle' as const, primary: true }
  const statusText = todayOpen ? 'En cours' : todaySession ? 'Clôturée' : 'À démarrer'

  return (
    <View style={styles.container}>
      <ScreenHeader title="Accueil" subtitle={dateLabel(todayStr)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── 1. How did today go? ── */}
        <LinearGradient
          colors={[COLORS.inkSoft, COLORS.ink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Aujourd'hui</Text>
            <View style={styles.statusChip}>
              <View style={[styles.statusPip, { backgroundColor: todayOpen ? COLORS.amber : todaySession ? COLORS.emerald : COLORS.slate400 }]} />
              <Text style={styles.statusChipText}>{statusText}</Text>
            </View>
          </View>

          <Text style={styles.heroRevenue} numberOfLines={1}>{fmt(todayRevenue)}</Text>
          <Text style={styles.heroRevenueLabel}>Revenu du jour</Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroSubRow}>
            <View>
              <Text style={styles.heroSubLabel}>Profit net</Text>
              <Text style={[styles.heroSubValue, { color: todayProfit >= 0 ? '#34D399' : '#FB7185' }]}>
                {todayProfit >= 0 ? '+' : ''}{fmt(todayProfit)}
              </Text>
            </View>
            <View style={styles.marginChip}>
              <Text style={styles.marginChipValue}>{todayMargin.toFixed(0)}%</Text>
              <Text style={styles.marginChipLabel}>marge</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.heroCta, cta.primary && styles.heroCtaPrimary]}
            onPress={() => navigation.navigate('Session')}
            activeOpacity={0.85}
          >
            <Ionicons name={cta.icon} size={18} color={cta.primary ? COLORS.white : COLORS.primaryLight} />
            <Text style={[styles.heroCtaText, cta.primary && { color: COLORS.white }]}>{cta.label}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── 7-day pulse ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Revenu 7j</Text>
            <Text style={styles.statValue} numberOfLines={1}>{fmtShort(last7Revenue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Profit 7j</Text>
            <Text
              style={[styles.statValue, { color: last7Profit >= 0 ? COLORS.emerald : COLORS.rose }]}
              numberOfLines={1}
            >
              {fmtShort(last7Profit)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Marge 7j</Text>
            <Text style={[styles.statValue, { color: last7Margin >= 15 ? COLORS.emerald : last7Margin >= 0 ? COLORS.amber : COLORS.rose }]}>
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
                  <View style={[styles.alertBar, { backgroundColor: isOut ? COLORS.rose : COLORS.amber }]} />
                  <View style={styles.alertMain}>
                    <Text style={styles.alertName} numberOfLines={1}>{d.name}</Text>
                    <Text style={styles.alertSub}>Seuil {d.min_stock} · {d.category}</Text>
                  </View>
                  <View style={styles.alertRight}>
                    <Text style={[styles.alertStock, { color: isOut ? COLORS.rose : COLORS.amber }]}>
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
              <Ionicons name="checkmark-circle" size={20} color={COLORS.emerald} />
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
    padding: 16,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPip: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroRevenue: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroRevenueLabel: { fontSize: 12, color: COLORS.slate400, fontWeight: '500', marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroSubLabel: { fontSize: 12, color: COLORS.slate400, fontWeight: '500', marginBottom: 3 },
  heroSubValue: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  marginChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  marginChipValue: { fontSize: 18, fontWeight: '800', color: COLORS.white, fontVariant: ['tabular-nums'] },
  marginChipLabel: { fontSize: 10, color: COLORS.slate400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroCtaPrimary: { backgroundColor: COLORS.primary },
  heroCtaText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: { fontSize: 11, color: COLORS.slate, fontWeight: '600', letterSpacing: 0.2 },
  statValue: { fontSize: 17, fontWeight: '800', color: COLORS.slateDark, marginTop: 6, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.slateDark, letterSpacing: -0.2 },
  sectionHint: { fontSize: 12, color: COLORS.slate, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  alertBar: { width: 4, height: 30, borderRadius: 2 },
  alertMain: { flex: 1, minWidth: 0 },
  alertName: { fontSize: 14, color: COLORS.slateDark, fontWeight: '600' },
  alertSub: { fontSize: 11, color: COLORS.slate, marginTop: 2 },
  alertRight: { alignItems: 'flex-end' },
  alertStock: { fontSize: 13, fontWeight: '700' },
  moreLink: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 10 },
  healthyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: COLORS.emeraldLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  healthyIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  healthyText: { flex: 1, fontSize: 13, color: '#065F46', fontWeight: '600' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  topRank: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: COLORS.primarySoft, color: COLORS.primary,
    fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 22,
  },
  topMain: { flex: 1, minWidth: 0, gap: 6 },
  topName: { fontSize: 14, fontWeight: '600', color: COLORS.slateDark },
  topBarTrack: { height: 5, borderRadius: 3, backgroundColor: COLORS.slateLight, overflow: 'hidden' },
  topBarFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  topRight: { alignItems: 'flex-end' },
  topRevenue: { fontSize: 14, fontWeight: '800', color: COLORS.slateDark, fontVariant: ['tabular-nums'] },
  topSold: { fontSize: 11, color: COLORS.slate, marginTop: 2 },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyHintText: { flex: 1, fontSize: 13, color: COLORS.slate, lineHeight: 18 },
})
