import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'
import { Session, Expense } from '../types'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { useSettings } from '../contexts/SettingsContext'
import { COLORS, FONT, fmt, fmtNum, dateLabelLong, formatWithCassiers, formatWithCassiersShort, today } from '../utils/helpers'

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>

// Inject print-specific CSS once on web
function usePrintStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return
    // @ts-ignore – document is available in web
    const doc = document as any
    const id = 'bartrack-print-styles'
    if (doc.getElementById(id)) return
    const style = doc.createElement('style')
    style.id = id
    style.textContent = `
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body > * { display: none !important; }
        #bartrack-print-root { display: block !important; }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        @page { margin: 16mm; }
      }
    `
    doc.head.appendChild(style)
  }, [])
}

export default function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params
  const { barInfo } = useSettings()
  const [session, setSession] = useState<Session | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [drinksCategoryMap, setDrinksCategoryMap] = useState<Record<string, string>>({})

  const fadeAnim = useRef(new Animated.Value(0)).current
  usePrintStyles()

  const handlePrint = () => {
    if (Platform.OS !== 'web') return
    // @ts-ignore – window and document are available on web
    const w = window as any
    w.print()
  }

  useEffect(() => { loadData() }, [sessionId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sessionRes, expensesRes, drinksRes] = await Promise.all([
        supabase.from('sessions').select('*, session_lines (*)').eq('id', sessionId).single(),
        supabase.from('expenses').select('*').order('created_at'),
        supabase.from('drinks').select('id, category'),
      ])

      if (sessionRes.error) throw sessionRes.error
      const sessionData = sessionRes.data

      const filteredExpenses = (expensesRes.data ?? []).filter(e => e.date === sessionData.date)

      const categoryMap: Record<string, string> = {}
      drinksRes.data?.forEach(d => { categoryMap[d.id] = d.category })

      setSession(sessionData)
      setExpenses(filteredExpenses)
      setDrinksCategoryMap(categoryMap)

      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Chargement du journal…</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View style={s.loadingWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.slate} />
        <Text style={s.loadingText}>Session introuvable</Text>
      </View>
    )
  }

  const lines = session.session_lines ?? []
  const purchaseLines = lines.filter(l => l.purchased > 0)
  const saleLines = lines.filter(l => l.sold > 0).sort((a, b) => b.revenue - a.revenue)
  const activeLines = lines.filter(l => l.purchased > 0 || l.sold > 0)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalUnits = saleLines.reduce((s, l) => s + l.sold, 0)
  const totalPurchased = purchaseLines.reduce((s, l) => s + l.purchased, 0)
  const grossProfit = session.total_revenue - session.total_cost
  const netProfit = session.total_revenue - session.total_cost - totalExpenses

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <ScreenHeader
        title="Journal de caisse"
        subtitle={dateLabelLong(session.date)}
        onBack={() => navigation.goBack()}
        right={
          Platform.OS === 'web' ? (
            <TouchableOpacity onPress={handlePrint} style={s.printBtn}>
              <Ionicons name="print-outline" size={18} color={COLORS.primary} />
              <Text style={s.printBtnText}>Imprimer</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={s.body}
        // @ts-ignore – id is valid on web
        id="bartrack-print-root"
      >
        {/* ── Print header (web only, hidden on screen) ── */}
        {Platform.OS === 'web' && (
          // @ts-ignore – className is valid on web
          <View style={s.printHeader} className="print-only">
            <Text style={s.printTitle}>{barInfo?.name || 'BarTrack'} — Journal de caisse</Text>
            <Text style={s.printDate}>{dateLabelLong(session.date)}</Text>
            <View style={s.printDivider} />
          </View>
        )}

        {/* ── Status badge ── */}
        {/* @ts-ignore – className is valid on web */}
        <View style={[s.statusBadge, session.closed ? s.statusClosed : s.statusOpen]} className="no-print">
          <Ionicons
            name={session.closed ? 'checkmark-circle' : 'time-outline'}
            size={15}
            color={session.closed ? COLORS.emerald : COLORS.amber}
          />
          <Text style={[s.statusText, { color: session.closed ? COLORS.emerald : COLORS.amber }]}>
            {session.closed ? 'Journée clôturée' : 'Session en cours'}
          </Text>
        </View>

        {/* ── P&L Summary ── */}
        <Section title="Compte de résultat" icon="bar-chart-outline">
          <JRow label="Revenu des ventes" value={fmt(session.total_revenue)} accent={COLORS.primary} />
          <JRow label={`Unités vendues`} value={fmtNum(totalUnits)} muted />
          <JRow label="Coût des achats" value={`-${fmt(session.total_cost)}`} accent={COLORS.rose} />
          <Divider />
          <JRow
            label="Marge brute"
            value={fmt(grossProfit)}
            accent={grossProfit >= 0 ? COLORS.primary : COLORS.rose}
            highlight
          />
          <JRow label="Dépenses opérationnelles" value={`-${fmt(totalExpenses)}`} accent={COLORS.rose} />
          <Divider />
          <JRow
            label="Résultat net"
            value={fmt(netProfit)}
            accent={netProfit >= 0 ? COLORS.emerald : COLORS.rose}
            bold
          />
        </Section>

        {/* ── Comprehensive stock movement table ── */}
        <Section title="Mouvements de stock" icon="swap-vertical-outline" count={activeLines.length}>
          {activeLines.length === 0 ? (
            <EmptySection label="Aucun mouvement de stock" />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={s.tableScrollContainer}
            >
              <View style={s.stockTable}>
                {/* header */}
                <View style={s.stockHead}>
                  <Text style={[s.sth, s.sthArticle]}>Article</Text>
                  <Text style={[s.sth, s.sthNum]}>Début</Text>
                  <Text style={[s.sth, s.sthNum]}>+Reçu</Text>
                  <Text style={[s.sth, s.sthNum]}>Dispo</Text>
                  <Text style={[s.sth, s.sthNum]}>Compté</Text>
                  <Text style={[s.sth, s.sthNum, { color: COLORS.primary }]}>Vendus</Text>
                  <Text style={[s.sth, s.sthMoney]}>Revenu</Text>
                </View>

                {activeLines.map((line, i) => {
                  const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
                  const available = line.opening_stock + line.purchased
                  const isEven = i % 2 === 0
                  return (
                    <View key={line.id} style={[s.stockRow, isEven && s.stockRowEven]}>
                      <Text style={[s.std, s.stdArticle]} numberOfLines={1}>{line.drink_name}</Text>
                      <Text style={[s.std, s.stdNum]}>{fmtNum(line.opening_stock)}</Text>
                      <Text style={[s.std, s.stdNum, line.purchased > 0 && s.stdPos]}>
                        {line.purchased > 0 ? `+${fmtNum(line.purchased)}` : '—'}
                      </Text>
                      <Text style={[s.std, s.stdNum]}>{fmtNum(available)}</Text>
                      <Text style={[s.std, s.stdNum]}>{fmtNum(line.closing_stock)}</Text>
                      <Text style={[s.std, s.stdNum, line.sold > 0 && s.stdAccent]}>
                        {line.sold > 0 ? fmtNum(line.sold) : '—'}
                      </Text>
                      <Text style={[s.std, s.stdMoney]}>
                        {line.sold > 0 ? fmt(line.revenue) : '—'}
                      </Text>
                    </View>
                  )
                })}

                {/* totals row */}
                <View style={s.stockTotalRow}>
                  <Text style={[s.stTotal, s.stdArticle]}>TOTAL</Text>
                  <Text style={[s.stTotal, s.stdNum]}>—</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdPos]}>
                    {totalPurchased > 0 ? `+${fmtNum(totalPurchased)}` : '—'}
                  </Text>
                  <Text style={[s.stTotal, s.stdNum]}>—</Text>
                  <Text style={[s.stTotal, s.stdNum]}>—</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdAccent]}>{fmtNum(totalUnits)}</Text>
                  <Text style={[s.stTotal, s.stdMoney, { color: COLORS.primary }]}>{fmt(session.total_revenue)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </Section>

        {/* ── Purchases detail ── */}
        {purchaseLines.length > 0 && (
          <Section title="Réceptions / Achats" icon="cube-outline" count={purchaseLines.length}>
            <SimpleTable
              headers={['Article', 'Quantité', 'Coût']}
              rows={purchaseLines.map(l => [l.drink_name, fmtNum(l.purchased), fmt(l.cost)])}
            />
          </Section>
        )}

        {/* ── Sales detail ── */}
        {saleLines.length > 0 && (
          <Section title="Détail des ventes" icon="trending-up-outline" count={saleLines.length}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={s.tableScrollContainer}
            >
              <View style={s.salesTable}>
                <View style={s.salesHead}>
                  <Text style={[s.sth, s.sthSalesArticle]}>Article</Text>
                  <Text style={[s.sth, s.sthNum]}>Vendu</Text>
                  <Text style={[s.sth, s.sthMoney]}>Revenu</Text>
                </View>
                {saleLines.map((line, i) => {
                  const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
                  return (
                    <View key={line.id} style={[s.salesRow, i % 2 === 0 && s.stockRowEven]}>
                      <View style={s.stdSalesArticle}>
                        <Text style={s.std} numberOfLines={1}>{line.drink_name}</Text>
                        <Text style={s.saleFlow} numberOfLines={1}>
                          {line.opening_stock}
                          {line.purchased > 0 ? `+${line.purchased}` : ''}
                          →{line.closing_stock}
                        </Text>
                      </View>
                      <Text style={[s.std, s.stdNum, s.stdAccent]}>{formatWithCassiersShort(line.sold, cat)}</Text>
                      <Text style={[s.std, s.stdMoney]} numberOfLines={1}>{fmt(line.revenue)}</Text>
                    </View>
                  )
                })}
                <View style={s.stockTotalRow}>
                  <Text style={[s.stTotal, s.stdSalesArticle]}>TOTAL</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdAccent]}>{fmtNum(totalUnits)}</Text>
                  <Text style={[s.stTotal, s.stdMoney, { color: COLORS.primary }]}>{fmt(session.total_revenue)}</Text>
                </View>
              </View>
            </ScrollView>
          </Section>
        )}

        {/* ── Expenses ── */}
        <Section title="Dépenses du jour" icon="receipt-outline">
          <SessionExpensesPanel
            date={session.date}
            expenses={expenses}
            onChange={loadData}
            readOnly={session.closed && session.date !== today()}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, icon, count, children,
}: {
  title: string; icon?: string; count?: number; children: React.ReactNode
}) {
  return (
    <View style={sc.wrap}>
      <View style={sc.head}>
        <View style={sc.headLeft}>
          {icon && <Ionicons name={icon as any} size={16} color={COLORS.primary} />}
          <Text style={sc.title}>{title}</Text>
        </View>
        {count !== undefined && (
          <View style={sc.countPill}>
            <Text style={sc.countText}>{count}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  )
}

const sc = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 14,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.slateDark },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    borderRadius: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  countText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.primary },
})

function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 6 }} />
}

function EmptySection({ label }: { label: string }) {
  return <Text style={{ fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate, fontStyle: 'italic' }}>{label}</Text>
}

function JRow({
  label, value, muted, accent, bold, highlight,
}: {
  label: string; value: string; muted?: boolean; accent?: string; bold?: boolean; highlight?: boolean
}) {
  return (
    <View style={[jr.row, highlight && jr.highlight]}>
      <Text style={[jr.label, muted && jr.muted]}>{label}</Text>
      <Text style={[jr.value, bold && jr.bold, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  )
}

const jr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  highlight: { backgroundColor: COLORS.slateLight + '60', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  label: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate },
  muted: { fontSize: 12, color: COLORS.slate },
  value: { fontSize: 14, fontFamily: FONT.semibold, color: COLORS.slateDark, fontVariant: ['tabular-nums'] },
  bold: { fontSize: 16, fontFamily: FONT.bold },
})

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      style={s.tableScrollContainer}
    >
      <View style={st.table}>
        <View style={st.head}>
          {headers.map((h, i) => (
            <Text key={i} style={[st.th, i === 0 ? st.thFirst : st.thRight]}>{h}</Text>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={[st.row, ri % 2 === 0 && st.rowEven]}>
            {row.map((cell, ci) => (
              <Text key={ci} style={[st.td, ci === 0 ? st.tdFirst : st.tdRight]} numberOfLines={1}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', minWidth: '100%' },
  head: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  thFirst: { width: 140, minWidth: 140, paddingRight: 12 },
  thRight: { width: 100, minWidth: 100, textAlign: 'right', paddingHorizontal: 8 },
  row: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  rowEven: { backgroundColor: COLORS.surface + '60' },
  td: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.slateDark },
  tdFirst: { width: 140, minWidth: 140, paddingRight: 12 },
  tdRight: { width: 100, minWidth: 100, textAlign: 'right', fontFamily: FONT.bold, paddingHorizontal: 8 },
})

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.surface },
  loadingText: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate },

  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 144, 226, 0.4)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  printBtnText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.primary },

  body: { padding: 14, paddingBottom: 40 },

  // print header (only visible when printing via CSS)
  printHeader: { display: 'none', marginBottom: 20 },
  printTitle: { fontSize: 20, fontFamily: FONT.bold, color: COLORS.slateDark },
  printDate: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 4 },
  printDivider: { height: 2, backgroundColor: COLORS.primary, marginTop: 12 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  statusClosed: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  statusOpen: { backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.4)' },
  statusText: { fontSize: 13, fontFamily: FONT.semibold },

  // table scroll container
  tableScrollContainer: {
    width: '100%',
  },

  // stock movement table
  stockTable: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', minWidth: '100%' },
  stockHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sth: { fontSize: 9, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  sthArticle: { width: 120, minWidth: 120, paddingRight: 12 },
  sthNum: { width: 60, minWidth: 60, textAlign: 'right', paddingHorizontal: 6 },
  sthMoney: { width: 90, minWidth: 90, textAlign: 'right', paddingHorizontal: 6 },
  sthSalesArticle: { flex: 1, minWidth: 140, paddingRight: 12 },
  stockRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  stockRowEven: { backgroundColor: COLORS.surface + '60' },
  std: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.slateDark },
  stdArticle: { width: 120, minWidth: 120, paddingRight: 12 },
  stdNum: { width: 60, minWidth: 60, textAlign: 'right', fontFamily: FONT.semibold, fontVariant: ['tabular-nums'], paddingHorizontal: 6 },
  stdMoney: { width: 90, minWidth: 90, textAlign: 'right', fontFamily: FONT.bold, color: COLORS.primary, fontVariant: ['tabular-nums'], fontSize: 11, paddingHorizontal: 6 },
  stdSalesArticle: { flex: 1, minWidth: 140, paddingRight: 12 },
  stdPos: { color: COLORS.primary },
  stdAccent: { color: COLORS.primary },
  stockTotalRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primaryLight + '50',
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary + '40',
    alignItems: 'center',
  },
  stTotal: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.slateDark },

  // sales table
  salesTable: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', minWidth: '100%' },
  salesHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  salesRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center', gap: 8 },
  saleFlow: { fontSize: 9, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 2, fontVariant: ['tabular-nums'] },
})
