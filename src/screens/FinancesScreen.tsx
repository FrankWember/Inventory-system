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
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Session, Expense } from '../types'
import { Card } from '../components/Card'
import { ScreenHeader } from '../components/ScreenHeader'
import { SessionJournal } from '../components/SessionJournal'
import { ScreenSkeleton } from '../components/Skeleton'
import { COLORS, fmt, fmtNum, fmtShort, dateLabel } from '../utils/helpers'

type FeedItem =
  | { kind: 'session'; id: string; date: string; sortKey: string; session: Session; dayExpenses: number }
  | { kind: 'expense'; id: string; date: string; sortKey: string; expense: Expense }

function OverviewRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, color ? { color } : null]}>{value}</Text>
    </View>
  )
}

export default function FinancesScreen() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [journalSession, setJournalSession] = useState<Session | null>(null)
  const [journalExpenses, setJournalExpenses] = useState<Expense[]>([])

  const loadData = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*, session_lines (*)')
        .order('date', { ascending: false })

      if (sessionsError) throw sessionsError

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })

      if (expensesError) throw expensesError

      setSessions(sessionsData || [])
      setExpenses(expensesData || [])
    } catch (error) {
      console.error('Error loading finances:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const expensesByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      map[e.date] = (map[e.date] ?? 0) + e.amount
    }
    return map
  }, [expenses])

  const feed = useMemo<FeedItem[]>(() => {
    const sessionDates = new Set(sessions.map(s => s.date))
    const items: FeedItem[] = []

    for (const s of sessions) {
      items.push({
        kind: 'session',
        id: `s-${s.id}`,
        date: s.date,
        sortKey: `${s.date}T${s.created_at}`,
        session: s,
        dayExpenses: expensesByDate[s.date] ?? 0,
      })
    }

    for (const e of expenses) {
      if (sessionDates.has(e.date)) continue
      items.push({
        kind: 'expense',
        id: `e-${e.id}`,
        date: e.date,
        sortKey: `${e.date}T${e.created_at}`,
        expense: e,
      })
    }

    return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 20)
  }, [sessions, expenses, expensesByDate])

  const openJournal = async (session: Session) => {
    const { data } = await supabase.from('expenses').select('*').eq('date', session.date).order('created_at')
    setJournalExpenses(data ?? [])
    setJournalSession(session)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <ScreenHeader title="Finances" />
        <ScreenSkeleton variant="list" />
      </View>
    )
  }

  const totalRevenue = sessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalSessionCost = sessions.reduce((sum, s) => sum + s.total_cost, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalRevenue - totalSessionCost - totalExpenses
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Finances" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Profit net cumulé</Text>
          <Text
            style={[styles.heroValue, { color: netProfit >= 0 ? '#86EFAC' : '#FCA5A5' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {fmt(netProfit)}
          </Text>
          <View style={styles.marginTrack}>
            <View
              style={[
                styles.marginFill,
                {
                  width: `${Math.min(100, Math.max(0, margin))}%`,
                  backgroundColor: margin >= 20 ? COLORS.emerald : margin >= 10 ? COLORS.amber : COLORS.rose,
                },
              ]}
            />
          </View>
          <Text style={styles.marginHint}>{margin.toFixed(0)}% marge</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Ionicons name="trending-up" size={16} color={COLORS.emerald} />
            <Text style={styles.kpiLabel}>Revenu</Text>
            <Text style={[styles.kpiValue, { color: COLORS.emerald }]} numberOfLines={1}>
              {fmtShort(totalRevenue)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Ionicons name="cart-outline" size={16} color={COLORS.amber} />
            <Text style={styles.kpiLabel}>Achats</Text>
            <Text style={[styles.kpiValue, { color: COLORS.amber }]} numberOfLines={1}>
              {fmtShort(totalSessionCost)}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.rose} />
            <Text style={styles.kpiLabel}>Charges</Text>
            <Text style={[styles.kpiValue, { color: COLORS.rose }]} numberOfLines={1}>
              {fmtShort(totalExpenses)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activité récente</Text>

        {feed.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.slate} />
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </Card>
        ) : (
          feed.map(item => {
            const isExpanded = expandedId === item.id

            if (item.kind === 'session') {
              const { session, dayExpenses } = item
              const units = session.session_lines?.reduce((n, l) => n + l.sold, 0) ?? 0
              const gross = session.total_revenue - session.total_cost

              return (
                <View key={item.id} style={[styles.txCard, isExpanded && styles.txCardExpanded]}>
                  <TouchableOpacity
                    style={styles.txRow}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.txIcon, { backgroundColor: COLORS.emeraldLight }]}>
                      <Ionicons name="calendar" size={18} color={COLORS.emerald} />
                    </View>
                    <View style={styles.txMain}>
                      <Text style={styles.txTitle}>{dateLabel(session.date)}</Text>
                      <Text style={styles.txMeta}>
                        {session.closed ? 'Clôturée' : 'En cours'}
                        {units > 0 ? ` · ${fmtNum(units)} vendus` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: COLORS.emerald }]}>
                      {fmt(session.total_profit)}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.slate}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.overview}>
                      <OverviewRow label="Revenu" value={fmt(session.total_revenue)} color={COLORS.emerald} />
                      <OverviewRow label="Coût achats" value={`−${fmt(session.total_cost)}`} color={COLORS.amber} />
                      {dayExpenses > 0 && (
                        <OverviewRow label="Dépenses jour" value={`−${fmt(dayExpenses)}`} color={COLORS.rose} />
                      )}
                      <OverviewRow label="Profit brut" value={fmt(gross)} />
                      <OverviewRow
                        label="Profit net"
                        value={fmt(session.total_profit)}
                        color={session.total_profit >= 0 ? COLORS.emerald : COLORS.rose}
                      />
                      <TouchableOpacity style={styles.journalLink} onPress={() => openJournal(session)}>
                        <Text style={styles.journalLinkText}>Voir le journal complet</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            }

            const { expense } = item
            return (
              <View key={item.id} style={[styles.txCard, isExpanded && styles.txCardExpanded]}>
                <TouchableOpacity
                  style={styles.txRow}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.txIcon, { backgroundColor: COLORS.roseLight }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={COLORS.rose} />
                  </View>
                  <View style={styles.txMain}>
                    <Text style={styles.txTitle} numberOfLines={1}>{expense.description}</Text>
                    <Text style={styles.txMeta}>{dateLabel(expense.date)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: COLORS.rose }]}>−{fmt(expense.amount)}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.slate}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.overview}>
                    <OverviewRow label="Catégorie" value={expense.category} />
                    <OverviewRow label="Montant" value={fmt(expense.amount)} color={COLORS.rose} />
                    <OverviewRow label="Date" value={dateLabel(expense.date)} />
                  </View>
                )}
              </View>
            )
          })
        )}
      </ScrollView>

      <SessionJournal
        visible={!!journalSession}
        session={journalSession}
        expenses={journalExpenses}
        onClose={() => setJournalSession(null)}
        onExpensesChange={loadData}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  hero: {
    backgroundColor: COLORS.ink,
    borderRadius: 18,
    padding: 22,
    marginBottom: 12,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroValue: { fontSize: 34, fontWeight: '800', marginBottom: 14, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  marginTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  marginFill: { height: '100%', borderRadius: 3 },
  marginHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  kpiLabel: { fontSize: 11, color: COLORS.slate, fontWeight: '500' },
  kpiValue: { fontSize: 14, fontWeight: '700', color: COLORS.slateDark },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 10,
    marginLeft: 2,
  },
  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txCardExpanded: { borderColor: COLORS.primaryLight, backgroundColor: '#FAFBFF' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMain: { flex: 1, minWidth: 0 },
  txTitle: { fontSize: 15, fontWeight: '600', color: COLORS.slateDark },
  txMeta: { fontSize: 12, color: COLORS.slate, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  overview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewLabel: { fontSize: 13, color: COLORS.slate },
  overviewValue: { fontSize: 13, fontWeight: '600', color: COLORS.slateDark },
  journalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
  },
  journalLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  emptyCard: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.slate },
})
