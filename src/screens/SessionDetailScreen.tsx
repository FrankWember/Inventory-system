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
  LayoutAnimation,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'
import { Session, Expense } from '../types'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { LoadingModal } from '../components/LoadingModal'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'
import { COLORS, FONT, fmt, fmtNum, dateLabelLong, formatWithCassiers, formatWithCassiersShort, drinkRackSize, today } from '../utils/helpers'

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
  const { t } = useTranslation()
  const [session, setSession] = useState<Session | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [printLoading, setPrintLoading] = useState(false)
  const [drinksCategoryMap, setDrinksCategoryMap] = useState<Record<string, string>>({})
  const [drinksRackMap, setDrinksRackMap] = useState<Record<string, number>>({})

  const fadeAnim = useRef(new Animated.Value(0)).current
  usePrintStyles()

  const handlePrint = async () => {
    if (Platform.OS !== 'web') return

    setPrintLoading(true)

    // Small delay to show the loading modal
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      // @ts-ignore – window and document are available on web
      const w = window as any
      w.print()
    } finally {
      // Keep modal visible for a bit longer for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      setPrintLoading(false)
    }
  }

  useEffect(() => { loadData() }, [sessionId])

  const loadData = async () => {
    setLoading(true)
    try {
      const sessionRes = await supabase.from('sessions').select('*, session_lines (*)').eq('id', sessionId).single()
      if (sessionRes.error) throw sessionRes.error
      const sessionData = sessionRes.data

      // Filter expenses by date server-side — the old code downloaded the
      // entire expenses table on every journal open.
      const [expensesRes, drinksRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('date', sessionData.date).order('created_at'),
        supabase.from('drinks').select('id, category, cassier_quantity, rack_size'),
      ])
      if (expensesRes.error) throw expensesRes.error

      const filteredExpenses = expensesRes.data ?? []

      const categoryMap: Record<string, string> = {}
      const rackMap: Record<string, number> = {}
      drinksRes.data?.forEach(d => {
        categoryMap[d.id] = d.category
        rackMap[d.id] = drinkRackSize(d)
      })

      setSession(sessionData)
      setExpenses(filteredExpenses)
      setDrinksCategoryMap(categoryMap)
      setDrinksRackMap(rackMap)

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
        <Text style={s.loadingText}>{t('settings.loadingJournal')}</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View style={s.loadingWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.slate} />
        <Text style={s.loadingText}>{t('settings.sessionNotFound')}</Text>
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
      <LoadingModal
        visible={printLoading}
        message={t('settings.printPreparing')}
      />

      <ScreenHeader
        title={t('settings.journalTitle')}
        subtitle={dateLabelLong(session.date)}
        onBack={() => navigation.goBack()}
        style={s.header}
        right={
          Platform.OS === 'web' ? (
            <TouchableOpacity onPress={handlePrint} style={s.printBtn}>
              <Ionicons name="print-outline" size={18} color={COLORS.white} />
              <Text style={s.printBtnText}>{t('settings.print')}</Text>
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
            <Text style={s.printTitle}>{t('settings.printHeader', { barName: barInfo?.name || 'BarTrack' })}</Text>
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
            {session.closed ? t('settings.dayClosed') : t('settings.sessionOpen')}
          </Text>
        </View>

        {/* ── P&L Summary ── */}
        <Section title={t('settings.plTitle')} icon="bar-chart-outline">
          <JRow label={t('settings.salesRevenue')} value={fmt(session.total_revenue)} accent={COLORS.primary} />
          <JRow label={t('settings.unitsSold')} value={fmtNum(totalUnits)} muted />
          <JRow label={t('settings.purchasesCost')} value={`-${fmt(session.total_cost)}`} accent={COLORS.rose} />
          <Divider />
          <JRow
            label={t('settings.grossMargin')}
            value={fmt(grossProfit)}
            accent={grossProfit >= 0 ? COLORS.primary : COLORS.rose}
            highlight
          />
          <JRow label={t('settings.operatingExpenses')} value={`-${fmt(totalExpenses)}`} accent={COLORS.rose} />
          <Divider />
          <JRow
            label={t('settings.netResult')}
            value={fmt(netProfit)}
            accent={netProfit >= 0 ? COLORS.emerald : COLORS.rose}
            bold
          />
        </Section>

        {/* ── Comprehensive stock movement table ── */}
        <Section title={t('settings.stockMovements')} icon="swap-vertical-outline" count={activeLines.length}>
          {activeLines.length === 0 ? (
            <EmptySection label={t('settings.noStockMovement')} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={s.tableScrollContainer}
              contentContainerStyle={s.tableScrollContent}
            >
              <View style={s.stockTable}>
                {/* header */}
                <View style={s.stockHead}>
                  <Text style={[s.sth, s.sthArticle]} numberOfLines={1}>{t('settings.colArticle')}</Text>
                  <Text style={[s.sth, s.sthNum]} numberOfLines={1}>{t('settings.colStart')}</Text>
                  <Text style={[s.sth, s.sthNum]} numberOfLines={1}>{t('settings.colReceived')}</Text>
                  <Text style={[s.sth, s.sthNum]} numberOfLines={1}>{t('settings.colAvailable')}</Text>
                  <Text style={[s.sth, s.sthNum]} numberOfLines={1}>{t('settings.colCounted')}</Text>
                  <Text style={[s.sth, s.sthNum, { color: COLORS.primary }]} numberOfLines={1}>{t('settings.colSold')}</Text>
                  <Text style={[s.sth, s.sthMoney]} numberOfLines={1}>{t('settings.colRevenue')}</Text>
                </View>

                {activeLines.map((line, i) => {
                  const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
                  const available = line.opening_stock + line.purchased
                  const isEven = i % 2 === 0
                  return (
                    <View key={line.id} style={[s.stockRow, isEven && s.stockRowEven]}>
                      <Text style={[s.std, s.stdArticle]} numberOfLines={1}>{line.drink_name}</Text>
                      <Text style={[s.std, s.stdNum]} numberOfLines={1}>{fmtNum(line.opening_stock)}</Text>
                      <Text style={[s.std, s.stdNum, line.purchased > 0 && s.stdPos]} numberOfLines={1}>
                        {line.purchased > 0 ? `+${fmtNum(line.purchased)}` : '—'}
                      </Text>
                      <Text style={[s.std, s.stdNum]} numberOfLines={1}>{fmtNum(available)}</Text>
                      <Text style={[s.std, s.stdNum]} numberOfLines={1}>{fmtNum(line.closing_stock)}</Text>
                      <Text style={[s.std, s.stdNum, line.sold > 0 && s.stdAccent]} numberOfLines={1}>
                        {line.sold > 0 ? fmtNum(line.sold) : '—'}
                      </Text>
                      <Text style={[s.std, s.stdMoney]} numberOfLines={1}>
                        {line.sold > 0 ? fmt(line.revenue) : '—'}
                      </Text>
                    </View>
                  )
                })}

                {/* totals row */}
                <View style={s.stockTotalRow}>
                  <Text style={[s.stTotal, s.stdArticle]} numberOfLines={1}>{t('settings.total')}</Text>
                  <Text style={[s.stTotal, s.stdNum]} numberOfLines={1}>—</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdPos]} numberOfLines={1}>
                    {totalPurchased > 0 ? `+${fmtNum(totalPurchased)}` : '—'}
                  </Text>
                  <Text style={[s.stTotal, s.stdNum]} numberOfLines={1}>—</Text>
                  <Text style={[s.stTotal, s.stdNum]} numberOfLines={1}>—</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdAccent]} numberOfLines={1}>{fmtNum(totalUnits)}</Text>
                  <Text style={[s.stTotal, s.stdMoney, { color: COLORS.primary }]} numberOfLines={1}>{fmt(session.total_revenue)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </Section>

        {/* ── Purchases detail ── */}
        {purchaseLines.length > 0 && (
          <Section title={t('settings.receiptsPurchases')} icon="cube-outline" count={purchaseLines.length}>
            <View style={s.simpleTableWrapper}>
              <View style={st.table}>
                <View style={st.head}>
                  {[t('settings.colArticle'), t('settings.colQuantity'), t('settings.colCost')].map((h, i) => (
                    <Text key={i} style={[st.th, i === 0 ? st.thFirst : st.thRight]}>{h}</Text>
                  ))}
                </View>
                {purchaseLines.map((l, ri) => (
                  <View key={ri} style={[st.row, ri % 2 === 0 && st.rowEven]}>
                    <Text style={[st.td, st.tdFirst]} numberOfLines={1}>{l.drink_name}</Text>
                    <Text style={[st.td, st.tdRight]} numberOfLines={1}>{fmtNum(l.purchased)}</Text>
                    <Text style={[st.td, st.tdRight]} numberOfLines={1}>{fmt(l.cost)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Section>
        )}

        {/* ── Sales detail ── */}
        {saleLines.length > 0 && (
          <Section title={t('settings.salesDetail')} icon="trending-up-outline" count={saleLines.length}>
            <View style={s.simpleTableWrapper}>
              <View style={s.salesTable}>
                <View style={s.salesHead}>
                  <Text style={[s.sth, s.sthSalesArticle]}>{t('settings.colArticle')}</Text>
                  <Text style={[s.sth, s.sthNum]}>{t('settings.colSold')}</Text>
                  <Text style={[s.sth, s.sthMoney]}>{t('settings.colRevenue')}</Text>
                </View>
                {saleLines.map((line, i) => {
                  const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
                  const rack = drinksRackMap[line.drink_id] ?? 1
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
                      <Text style={[s.std, s.stdNum, s.stdAccent]}>{formatWithCassiersShort(line.sold, cat, rack)}</Text>
                      <Text style={[s.std, s.stdMoney]} numberOfLines={1}>{fmt(line.revenue)}</Text>
                    </View>
                  )
                })}
                <View style={s.stockTotalRow}>
                  <Text style={[s.stTotal, s.stdSalesArticle]}>{t('settings.total')}</Text>
                  <Text style={[s.stTotal, s.stdNum, s.stdAccent]}>{fmtNum(totalUnits)}</Text>
                  <Text style={[s.stTotal, s.stdMoney, { color: COLORS.primary }]}>{fmt(session.total_revenue)}</Text>
                </View>
              </View>
            </View>
          </Section>
        )}

        {/* ── Expenses ── */}
        <Section title={t('settings.dayExpenses')} icon="receipt-outline">
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
  const [isExpanded, setIsExpanded] = useState(true)
  const animationHeight = useRef(new Animated.Value(1)).current

  const toggleSection = () => {
    const newExpandedState = !isExpanded

    // Configure layout animation for native
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    }

    // Animate the chevron
    Animated.timing(animationHeight, {
      toValue: newExpandedState ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()

    // Update state
    setIsExpanded(newExpandedState)
  }

  return (
    <View style={sc.wrap}>
      <TouchableOpacity onPress={toggleSection} style={sc.head} activeOpacity={0.7}>
        <View style={sc.headLeft}>
          {icon && <Ionicons name={icon as any} size={16} color={COLORS.primary} />}
          <Text style={sc.title}>{title}</Text>
        </View>
        <View style={sc.headRight}>
          {count !== undefined && (
            <View style={sc.countPill}>
              <Text style={sc.countText}>{count}</Text>
            </View>
          )}
          <Animated.View
            style={{
              transform: [{
                rotate: animationHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['180deg', '0deg'],
                }),
              }],
            }}
          >
            <Ionicons name="chevron-down" size={18} color={COLORS.slate} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <Animated.View
          style={[
            sc.content,
            {
              opacity: animationHeight,
            },
          ]}
        >
          {children}
        </Animated.View>
      )}
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
        transition: 'all 0.3s ease',
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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingBottom: 14,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  content: {
    paddingTop: 14,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
      },
    }),
  },
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
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  head: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  thFirst: {
    flex: 2,
    minWidth: 140,
    paddingRight: 12,
    ...Platform.select({ web: { flex: 2 } }),
  },
  thRight: {
    flex: 1,
    minWidth: 100,
    textAlign: 'right',
    paddingHorizontal: 8,
    ...Platform.select({ web: { flex: 1 } }),
  },
  row: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  rowEven: { backgroundColor: COLORS.surface + '60' },
  td: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.slateDark },
  tdFirst: {
    flex: 2,
    minWidth: 140,
    paddingRight: 12,
    ...Platform.select({ web: { flex: 2 } }),
  },
  tdRight: {
    flex: 1,
    minWidth: 100,
    textAlign: 'right',
    fontFamily: FONT.bold,
    paddingHorizontal: 8,
    ...Platform.select({ web: { flex: 1 } }),
  },
})

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.surface },
  loadingText: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate },

  header: {
    ...Platform.select({
      web: {
        paddingHorizontal: 24,
      },
    }),
  },

  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    borderWidth: 0,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          opacity: 0.9,
          transform: 'translateY(-1px)',
        },
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  printBtnText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.white,
  },

  body: {
    padding: 14,
    paddingBottom: 40,
    ...Platform.select({
      web: {
        maxWidth: 1000,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
      },
    }),
  },

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
    maxWidth: '100%',
    ...Platform.select({
      web: {
        overflow: 'auto',
      } as any,
    }),
  },
  // Let the scroll content fill the container on web so the flex columns stretch to
  // the full width instead of forcing a fixed 900px width that overflows narrow panels.
  tableScrollContent: {
    ...Platform.select({ web: { flexGrow: 1, width: '100%' } }),
  },

  simpleTableWrapper: {
    width: '100%',
    overflow: 'hidden',
  },

  // stock movement table
  stockTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: '100%',
    // On web fill the container (flex columns compress to fit) rather than a fixed 900px.
    ...Platform.select({ web: { width: '100%', minWidth: 0 } }),
  },
  stockHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sth: { fontSize: 9, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  sthArticle: {
    flex: 2,
    minWidth: 120,
    paddingRight: 12,
    ...Platform.select({ web: { flex: 2, minWidth: 88 } }),
  },
  sthNum: {
    flex: 1,
    minWidth: 60,
    textAlign: 'right',
    paddingHorizontal: 6,
    ...Platform.select({ web: { flex: 1, minWidth: 42 } }),
  },
  sthMoney: {
    flex: 1.5,
    minWidth: 90,
    textAlign: 'right',
    paddingHorizontal: 6,
    ...Platform.select({ web: { flex: 2, minWidth: 82, paddingLeft: 2 } }),
  },
  sthSalesArticle: { flex: 1, minWidth: 140, paddingRight: 12 },
  stockRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  stockRowEven: { backgroundColor: COLORS.surface + '60' },
  std: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.slateDark },
  stdArticle: {
    flex: 2,
    minWidth: 120,
    paddingRight: 12,
    ...Platform.select({ web: { flex: 2, minWidth: 88 } }),
  },
  stdNum: {
    flex: 1,
    minWidth: 60,
    textAlign: 'right',
    fontFamily: FONT.semibold,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 6,
    ...Platform.select({ web: { flex: 1, minWidth: 42 } }),
  },
  stdMoney: {
    flex: 1.5,
    minWidth: 90,
    textAlign: 'right',
    fontFamily: FONT.bold,
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    paddingHorizontal: 6,
    ...Platform.select({ web: { flex: 2, minWidth: 82, fontSize: 10, paddingLeft: 2 } }),
  },
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
  salesTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
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
