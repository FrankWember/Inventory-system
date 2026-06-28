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
import { supabase } from '../lib/supabase'
import { Drink, Session } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { Badge } from '../components/Badge'
import { COLORS, fmt, today, dateLabel, formatWithCassiers } from '../utils/helpers'

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const todayStr = today()
  const todaySession = sessions.find(s => s.date === todayStr && s.closed)
  const todayOpen = sessions.find(s => s.date === todayStr && !s.closed)
  const last7Sessions = sessions.slice(0, 7)

  const todayRevenue = todaySession?.total_revenue || 0
  const todayProfit = todaySession?.total_profit || 0
  const last7Revenue = last7Sessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const last7Profit = last7Sessions.reduce((sum, s) => sum + s.total_profit, 0)

  const alerts = drinks.filter(d => d.stock <= d.min_stock)
  const lowStock = alerts.filter(d => d.stock > 0)
  const outOfStock = alerts.filter(d => d.stock === 0)

  const drinkSales = drinks.map(drink => {
    const sold = last7Sessions.reduce((sum, s) => {
      const line = s.session_lines?.find(l => l.drink_id === drink.id)
      return sum + (line?.sold || 0)
    }, 0)
    return { drink, sold, revenue: sold * drink.price }
  })
  const top3 = drinkSales.filter(d => d.sold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 3)

  return (
    <View style={styles.container}>
      <ScreenHeader title="Accueil" subtitle={dateLabel(todayStr)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Today's summary */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Aujourd'hui</Text>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricLabel}>Revenu</Text>
            <Text style={styles.heroMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {fmt(todayRevenue)}
            </Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricLabel}>Profit</Text>
            <Text
              style={[styles.heroMetricValue, { color: todayProfit >= 0 ? '#A7F3D0' : '#FECACA' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {todayProfit >= 0 ? '+' : ''}{fmt(todayProfit)}
            </Text>
          </View>
          <Text style={styles.heroStatus}>
            {todaySession
              ? 'Session clôturée'
              : todayOpen
              ? 'Session en cours — inventaire du soir à compléter'
              : 'Pas encore de session — commencez par les achats'}
          </Text>
        </View>

        {/* Week stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Revenu 7j</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {fmt(last7Revenue)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Profit 7j</Text>
            <Text
              style={[styles.statValue, { color: last7Profit >= 0 ? COLORS.emerald : COLORS.rose }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {fmt(last7Profit)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Alertes</Text>
            <Text style={[styles.statValue, alerts.length > 0 && { color: COLORS.rose }]}>
              {alerts.length}
            </Text>
          </View>
        </View>

        {/* Stock alerts */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>À réapprovisionner</Text>
              {outOfStock.length > 0 && (
                <Badge variant="danger">{outOfStock.length} rupture</Badge>
              )}
            </View>
            {alerts.slice(0, 4).map(d => (
              <TouchableOpacity
                key={d.id}
                style={styles.alertRow}
                onPress={() => navigation.navigate('Inventory')}
              >
                <View style={[styles.alertDot, d.stock === 0 && styles.alertDotEmpty]} />
                <Text style={styles.alertName} numberOfLines={1}>{d.name}</Text>
                <Text style={styles.alertStock}>
                  {formatWithCassiers(d.stock, d.category)}
                </Text>
              </TouchableOpacity>
            ))}
            {alerts.length > 4 && (
              <Text style={styles.moreLink}>+{alerts.length - 4} autres</Text>
            )}
          </View>
        )}

        {/* Top sellers */}
        {top3.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meilleures ventes (7j)</Text>
            {top3.map((item, i) => (
              <View key={item.drink.id} style={styles.topRow}>
                <Text style={styles.topRank}>{i + 1}</Text>
                <Text style={styles.topName} numberOfLines={1}>{item.drink.name}</Text>
                <Text style={styles.topSold}>{item.sold} vendus</Text>
                <Text style={styles.topRevenue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {fmt(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {lowStock.length === 0 && outOfStock.length === 0 && top3.length === 0 && (
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
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginBottom: 10,
  },
  heroMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  heroMetricLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    width: 56,
  },
  heroMetricValue: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  heroStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginTop: 6,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
    marginRight: 10,
  },
  alertDotEmpty: {
    backgroundColor: COLORS.rose,
  },
  alertName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slateDark,
    fontWeight: '500',
  },
  alertStock: {
    fontSize: 13,
    color: COLORS.slate,
    fontWeight: '600',
  },
  moreLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  topRank: {
    width: 20,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate,
  },
  topName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slateDark,
  },
  topSold: {
    fontSize: 12,
    color: COLORS.slate,
  },
  topRevenue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    maxWidth: 100,
    textAlign: 'right',
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyHintText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.slate,
    lineHeight: 18,
  },
})
