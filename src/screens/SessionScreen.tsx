import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/authClient'
import { Drink, Category, Session, Expense } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { ScreenSkeleton } from '../components/Skeleton'
import { LoadingModal } from '../components/LoadingModal'
import SessionDetailScreen from './SessionDetailScreen'
import { usePdfExport } from '../hooks/usePdfExport'
import {
  FONT,
  fmt,
  fmtNum,
  today,
  dateLabel,
  dateLabelLong,
  formatWithCassiers,
  drinkRackSize,
  drinkPurchaseCost,
} from '../utils/helpers'
import { LIGHT_COLORS } from '../styles/theme'
import { saveSessionDraft, loadSessionDraft, clearSessionDraft } from '../utils/sessionDraft'
import { showAlert } from '../utils/appAlert'
import { useTranslation } from '../i18n'
import { useSettings } from '../contexts/SettingsContext'

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui",
}
LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan.','Feb.','Mar.','Apr.','May','Jun.','Jul.','Aug.','Sep.','Oct.','Nov.','Dec.'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'],
  today: 'Today',
}
LocaleConfig.defaultLocale = 'fr'

type Step = 'purchases' | 'expenses' | 'inventory' | 'summary' | 'done'

// The wizard mirrors a bar day: record deliveries, log the day's operating
// expenses, count the remaining stock, then review and close.
// Labels are i18n keys, resolved with t() at render time.
const STEPS = [
  { key: 'purchases', label: 'session.stepPurchases' },
  { key: 'expenses', label: 'session.stepExpenses' },
  { key: 'inventory', label: 'session.stepInventory' },
  { key: 'summary', label: 'session.stepSummary' },
]

const BREAKPOINT = 768

interface LineState {
  openingStock: number
  purchased: number
  closingStock: number
}

// ─── Animated step wrapper ────────────────────────────────────────────────────
function StepContent({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    fadeAnim.setValue(0)
    slideAnim.setValue(20)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
    ]).start()
  }, [stepKey])

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function ModernStepIndicator({
  steps,
  current,
  onStepPress,
  colors,
}: {
  steps: { key: string; label: string }[]
  current: string
  onStepPress?: (key: string) => void
  colors: typeof LIGHT_COLORS
}) {
  const { t } = useTranslation()
  const currentIndex = steps.findIndex(s => s.key === current)
  const progress = useRef(new Animated.Value(currentIndex)).current

  useEffect(() => {
    Animated.spring(progress, {
      toValue: currentIndex,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
    }).start()
  }, [currentIndex])

  const barWidth = progress.interpolate({
    inputRange: [0, steps.length - 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  })

  return (
    <View style={[si.container, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
      {/* progress bar track */}
      <View style={[si.track, { backgroundColor: colors.slateLight }]}>
        <Animated.View style={[si.fill, { width: barWidth, backgroundColor: colors.primary }]} />
      </View>

      {/* step labels */}
      <View style={si.labels}>
        {steps.map((step, i) => {
          const done = i < currentIndex
          const active = step.key === current
          const canPress = onStepPress && (done || active)
          return (
            <TouchableOpacity
              key={step.key}
              style={si.labelWrap}
              onPress={canPress ? () => onStepPress!(step.key) : undefined}
              activeOpacity={canPress ? 0.7 : 1}
            >
              <View style={[
                si.dot,
                { backgroundColor: colors.slateLight },
                done && { backgroundColor: colors.emerald },
                active && { backgroundColor: colors.primary }
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color={colors.white} />
                  : <Text style={[si.dotNum, { color: colors.slate }, active && { color: colors.white }]}>{i + 1}</Text>}
              </View>
              <Text style={[
                si.labelText,
                { color: colors.slate },
                active && { color: colors.primary },
                done && { color: colors.emerald }
              ]}>
                {t(step.label)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const si = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  track: {
    height: 3,
    borderRadius: 2,
    marginBottom: 12,
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotNum: {
    fontSize: 11,
    fontFamily: FONT.bold,
  },
  labelText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    textAlign: 'center',
  },
})

// ─── Mini stepper (for inline use) ───────────────────────────────────────────
function MiniStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  colors,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  colors: typeof LIGHT_COLORS
}) {
  return (
    <View style={ms.row}>
      <TouchableOpacity
        style={[
          ms.btn,
          ms.btnMinus,
          { backgroundColor: colors.white, borderColor: colors.border },
          value <= min && ms.btnDisabled
        ]}
        onPress={() => value > min && onChange(value - 1)}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={18} color={value <= min ? colors.slate : colors.rose} />
      </TouchableOpacity>
      <TextInput
        style={[ms.input, { borderColor: colors.border, color: colors.slateDark, backgroundColor: colors.white }]}
        value={value.toString()}
        onChangeText={t => { const n = parseInt(t) || 0; if (n >= min && n <= max) onChange(n) }}
        keyboardType="number-pad"
        selectTextOnFocus
      />
      <TouchableOpacity
        style={[ms.btn, ms.btnPlus, { backgroundColor: colors.primary }, value >= max && ms.btnDisabled]}
        onPress={() => value < max && onChange(value + 1)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

const ms = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMinus: {
    borderWidth: 1.5,
  },
  btnPlus: {},
  btnDisabled: { opacity: 0.35 },
  input: {
    width: 50,
    height: 34,
    borderWidth: 1.5,
    borderRadius: 8,
    fontSize: 15,
    fontFamily: FONT.bold,
    textAlign: 'center',
  },
})

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent, colors }: { label: string; value: string; accent?: string; colors: typeof LIGHT_COLORS }) {
  return (
    <View style={[
      sp.wrap,
      { borderColor: colors.border, backgroundColor: colors.white },
      accent ? { borderColor: accent, backgroundColor: accent + '12' } : {}
    ]}>
      <Text style={[sp.label, { color: colors.slate }, accent ? { color: accent } : {}]}>{label}</Text>
      <Text style={[sp.value, { color: colors.slateDark }, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  )
}

const sp = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  value: {
    fontSize: 16,
    fontFamily: FONT.bold,
    fontVariant: ['tabular-nums'],
  },
})

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SessionScreen({ navigation }: any) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { t, lang } = useTranslation()
  // Keep the calendar's locale in sync with the app language on every render.
  LocaleConfig.defaultLocale = lang
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [step, setStep] = useState<Step>('purchases')
  const [openSession, setOpenSession] = useState<Session | null>(null)
  const [closedToday, setClosedToday] = useState<Session | null>(null)
  const [lineStates, setLineStates] = useState<Record<string, LineState>>({})
  const [purchases, setPurchases] = useState<Record<string, number>>({})
  const [closingCounts, setClosingCounts] = useState<Record<string, number>>({})
  const [todayExpenses, setTodayExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tout')
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)
  const [selectedDate, setSelectedDate] = useState<string>(today())
  // Date the active (open or being-created) session belongs to. Usually today,
  // but the calendar allows starting/resuming a session for another date.
  const [sessionDate, setSessionDate] = useState<string>(today())
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [selectedDateSession, setSelectedDateSession] = useState<{ closed: Session | null; open: Session | null }>({ closed: null, open: null })
  const [barInfo, setBarInfo] = useState<{ name: string } | null>(null)
  const [userName, setUserName] = useState<string>('')

  // Purchases list: when an item first receives a delivery it is promoted to the top
  // group. We keep a ref to the scroll view so focus can follow it there (see onChange).
  const purchasesScrollRef = useRef<ScrollView>(null)

  const categories: Array<Category | 'Tout'> = ['Tout', 'Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']
  const todayStr = today()
  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  // PDF export hook
  const { loading: pdfLoading, progress: pdfProgress, generatePdf } = usePdfExport({
    barName: barInfo?.name || 'BarTrack'
  })

  const markedDates = useMemo(() => {
    const marks: any = {}
    allSessions.forEach(s => {
      marks[s.date] = { marked: true, dotColor: s.closed ? colors.emerald : colors.amber }
    })
    if (selectedDate) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary }
    }
    return marks
  }, [allSessions, selectedDate, colors])

  const getRackSize = (drinkId: string) => {
    const drink = drinks.find(d => d.id === drinkId)
    return drink ? drinkRackSize(drink) : 1
  }
  const toUnits = (racks: number, drinkId: string) => racks * getRackSize(drinkId)
  const toRacks = (units: number, drinkId: string) => Math.floor(units / getRackSize(drinkId))

  const loadExpensesForDate = async (date: string) => {
    const { data } = await supabase.from('expenses').select('*').eq('date', date).order('created_at')
    return data ?? []
  }

  const loadDataForDate = async (date: string) => {
    try {
      const expenses = await loadExpensesForDate(date)
      setTodayExpenses(expenses)
      const { data: dateSessions } = await supabase
        .from('sessions')
        .select('*, session_lines (*)')
        .eq('date', date)
        .order('created_at', { ascending: false })
      const closed = dateSessions?.find(s => s.closed) ?? null
      const open = dateSessions?.find(s => !s.closed) ?? null
      if (date === todayStr) { setClosedToday(closed); setOpenSession(open) }
      return { closed, open }
    } catch {
      return { closed: null, open: null }
    }
  }

  // Rebuild the wizard maps from a session's saved lines.
  const linesToState = (session: Session) => {
    const lines: Record<string, LineState> = {}
    const purchasesMap: Record<string, number> = {}
    const closingMap: Record<string, number> = {}
    for (const line of session.session_lines ?? []) {
      lines[line.drink_id] = { openingStock: line.opening_stock, purchased: line.purchased, closingStock: line.closing_stock }
      purchasesMap[line.drink_id] = line.purchased
      closingMap[line.drink_id] = line.closing_stock
    }
    return { lines, purchasesMap, closingMap }
  }

  // Resume the wizard where the user left it (survives refresh, tab switches
  // and app restarts). The freshly fetched session is the base; the draft
  // overlays the local edits that were never written to the DB.
  const restoreDraft = async (todaySessions: { closed: Session | null; open: Session | null }): Promise<boolean> => {
    const draft = await loadSessionDraft()
    if (!draft) return false

    let session: Session | null = null
    if (draft.sessionId) {
      const { data } = await supabase
        .from('sessions').select('*, session_lines (*)')
        .eq('id', draft.sessionId).maybeSingle()
      session = data ?? null
    } else if (draft.sessionDate === todayStr) {
      session = todaySessions.open
    } else {
      const { data } = await supabase
        .from('sessions').select('*, session_lines (*)')
        .eq('date', draft.sessionDate).eq('closed', false)
        .order('created_at', { ascending: false }).limit(1)
      session = data?.[0] ?? null
    }

    if (session?.closed) {
      // Closed after the draft was written (e.g. from another device) — stale.
      await clearSessionDraft()
      return false
    }

    if (session) {
      const { lines, purchasesMap, closingMap } = linesToState(session)
      setLineStates(lines)
      setPurchases({ ...purchasesMap, ...draft.purchases })
      setClosingCounts({ ...closingMap, ...draft.closingCounts })
      setOpenSession(session)
      setSessionDate(session.date)
      setSelectedDate(session.date)
      if (session.date !== todayStr) setTodayExpenses(await loadExpensesForDate(session.date))
      setStep(draft.step)
      return true
    }

    // No session row yet: the user was still entering deliveries. Don't
    // resurrect the draft if that date got a closed session in the meantime.
    const closedForDate = draft.sessionDate === todayStr
      ? todaySessions.closed
      : (await loadDataForDate(draft.sessionDate)).closed
    if (closedForDate) {
      await clearSessionDraft()
      return false
    }
    setLineStates({})
    setPurchases(draft.purchases)
    setClosingCounts(draft.closingCounts)
    setSessionDate(draft.sessionDate)
    setSelectedDate(draft.sessionDate)
    if (draft.sessionDate !== todayStr) setTodayExpenses(await loadExpensesForDate(draft.sessionDate))
    setStep('purchases')
    return true
  }

  const loadData = useCallback(async () => {
    try {
      // Load bar info and user name for PDF export
      const user = await getCurrentUser()
      if (user) {
        const { data: settings } = await supabase
          .from('settings')
          .select('bar_name, user_name')
          .eq('user_id', user.id)
          .single()

        if (settings) {
          setBarInfo({ name: settings.bar_name || 'BarTrack' })
          setUserName(settings.user_name || '')
        }
      }

      const { data: drinksData } = await supabase.from('drinks').select('*').eq('active', true).order('name')
      setDrinks(drinksData || [])

      const { closed, open } = await loadDataForDate(todayStr)
      setClosedToday(closed)
      setOpenSession(open)

      const restored = await restoreDraft({ closed, open })
      if (!restored) {
        if (closed && !open) {
          setStep('done')
        } else if (open?.session_lines?.length) {
          const { lines, purchasesMap, closingMap } = linesToState(open)
          setLineStates(lines)
          setPurchases(purchasesMap)
          setClosingCounts(closingMap)
          setStep(prev => (prev === 'summary' || prev === 'inventory' || prev === 'expenses' ? prev : 'inventory'))
        } else if (!open && !closed) {
          setStep('purchases')
          setPurchases({})
          setClosingCounts({})
          setLineStates({})
        }
      }

      const { data: history } = await supabase
        .from('sessions').select('*, session_lines (*)').eq('closed', true).order('date', { ascending: false }).limit(30)
      setPastSessions(history || [])

      const { data: allData } = await supabase
        .from('sessions').select('*').order('date', { ascending: false }).limit(365)
      setAllSessions(allData || [])
    } catch (e) {
      console.error('Error loading session:', e)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => { loadData() }, [loadData])

  // Snapshot the wizard after every edit so refresh/remount resumes it.
  // Skipped while loading (initial restore hasn't run yet) and on the landing
  // step ('done' means nothing is in progress from this screen's viewpoint).
  useEffect(() => {
    if (loading || step === 'done') return
    const hasLocalEdits =
      Object.values(purchases).some(v => v > 0) || Object.keys(closingCounts).length > 0
    if (!openSession && !hasLocalEdits) {
      // An untouched wizard (the default view on a day with no session) must
      // not hijack a later visit — drop any leftover draft instead.
      clearSessionDraft()
      return
    }
    const timer = setTimeout(() => {
      saveSessionDraft({
        sessionId: openSession?.id ?? null,
        sessionDate,
        step,
        purchases,
        closingCounts,
        updatedAt: Date.now(),
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [loading, step, purchases, closingCounts, openSession, sessionDate])

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWindowWidth(window.width))
    return () => sub?.remove()
  }, [])

  useEffect(() => {
    if (selectedDate && step === 'done') {
      loadDataForDate(selectedDate).then(setSelectedDateSession)
    }
  }, [selectedDate, step])

  const getExpected = (drinkId: string) => {
    const line = lineStates[drinkId]
    if (line) return line.openingStock + line.purchased
    const drink = drinks.find(d => d.id === drinkId)
    return (drink?.stock ?? 0) + (purchases[drinkId] ?? 0)
  }

  // ========================================
  // SESSION BALANCE CALCULATION FORMULAS
  // ========================================

  /**
   * Calculate sold units for a drink
   * Formula: Sold = (Opening Stock + Purchases) - Closing Stock
   *
   * Example: Opening 50 + Purchased 24 - Closing 60 = Sold 14 units
   */
  const getSold = (drinkId: string) => {
    const expected = getExpected(drinkId) // Opening stock + purchases
    const closing = closingCounts[drinkId] ?? expected // Physical count
    return Math.max(0, expected - closing) // Ensure non-negative
  }

  /**
   * Total Revenue from Sales
   * Formula: Revenue = Σ(Sold Units × Price per Unit)
   *
   * Example: If Coca sold 14 @ 600 FCFA = 8,400 FCFA
   */
  const totalRevenue = drinks.reduce((s, d) => s + getSold(d.id) * d.price, 0)

  /**
   * Total Purchase Cost (COGS - Cost of Goods Sold)
   * Formula: Purchase Cost = Σ(full crates × crate price + loose units × unit cost)
   *
   * Example: If bought 3 crates of Beaufort @ 6,800 FCFA = 20,400 FCFA cost
   */
  const totalPurchaseCost = drinks.reduce((s, d) => {
    const p = lineStates[d.id]?.purchased ?? purchases[d.id] ?? 0
    return s + drinkPurchaseCost(p, d)
  }, 0)

  /**
   * Total Operating Expenses
   * Formula: Expenses = Σ(All expense amounts)
   *
   * Example: Salary 5000 + Electricity 3000 = 8,000 FCFA
   */
  const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0)

  /**
   * Gross Profit (before expenses)
   * Formula: Gross Profit = Revenue - Purchase Cost
   *
   * Example: Revenue 8,400 - Cost 12,000 = -3,600 FCFA (loss on this item)
   */
  const grossProfit = totalRevenue - totalPurchaseCost

  /**
   * Net Profit (final balance after all expenses)
   * Formula: Net Profit = Gross Profit - Operating Expenses
   *
   * Example: Gross 10,000 - Expenses 8,000 = 2,000 FCFA net profit
   */
  const netProfit = grossProfit - totalExpenses

  const openJournal = (session: Session) => {
    if (isDesktop) setSelectedSessionId(session.id)
    else navigation.navigate('SessionDetail', { sessionId: session.id })
  }

  const startNewSession = async (date: string) => {
    setSelectedDate(date)
    setSessionDate(date)
    setStep('purchases')
    setPurchases({})
    setClosingCounts({})
    setLineStates({})
    if (date !== todayStr) await loadDataForDate(date)
  }

  // Supabase query builders resolve with { error } instead of throwing —
  // a batch write that silently fails would desync stock and session lines.
  const throwOnError = (results: Array<{ error: any } | null>) => {
    const failed = results.find(r => r?.error)
    if (failed?.error) throw failed.error
  }

  const reloadDrinks = async () => {
    const { data } = await supabase.from('drinks').select('*').eq('active', true).order('name')
    setDrinks(data || [])
  }

  const savePurchases = async () => {
    setSaving(true)
    try {
      // Get current user ID
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      if (openSession) {
        const ops: any[] = []
        const nextLines: Record<string, LineState> = { ...lineStates }
        const nextClosing: Record<string, number> = { ...closingCounts }
        for (const drink of drinks) {
          const newPurchased = purchases[drink.id] ?? 0
          const oldLine = lineStates[drink.id]
          const oldPurchased = oldLine?.purchased ?? 0
          const opening = oldLine?.openingStock ?? drink.stock - oldPurchased
          const delta = newPurchased - oldPurchased
          // Preserve any inventory count already entered: shift it by the
          // purchase delta instead of resetting it to opening + purchased.
          const oldClosing = closingCounts[drink.id] ?? oldLine?.closingStock ?? opening + oldPurchased
          const closing = Math.max(0, oldClosing + delta)
          if (oldLine) {
            ops.push(
              supabase.from('session_lines').update({ purchased: newPurchased, closing_stock: closing, cost: drinkPurchaseCost(newPurchased, drink) })
                .eq('session_id', openSession.id).eq('drink_id', drink.id)
            )
          } else {
            // Drink created after the session started — it has no line yet and
            // update() would silently match nothing.
            ops.push(
              supabase.from('session_lines').insert({
                user_id: user.id, session_id: openSession.id, drink_id: drink.id, drink_name: drink.name,
                opening_stock: opening, purchased: newPurchased, sold: 0, closing_stock: closing, revenue: 0, cost: drinkPurchaseCost(newPurchased, drink),
              })
            )
          }
          if (delta !== 0) ops.push(supabase.from('drinks').update({ stock: drink.stock + delta }).eq('id', drink.id))
          nextLines[drink.id] = { openingStock: opening, purchased: newPurchased, closingStock: closing }
          nextClosing[drink.id] = closing
        }
        throwOnError(await Promise.all(ops))
        setLineStates(nextLines)
        setClosingCounts(nextClosing)
        setStep('expenses')
        await reloadDrinks()
        return
      }

      // The session belongs to the date the user started it for (via the
      // calendar) — not necessarily today.
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, date: sessionDate, label: dateLabelLong(sessionDate), total_purchase: 0, total_revenue: 0, total_cost: 0, total_profit: 0, closed: false })
        .select().single()
      if (sessionError) throw sessionError

      const lines: Record<string, LineState> = {}
      const sessionLines = []
      const stockUpdates = []

      for (const drink of drinks) {
        const purchased = purchases[drink.id] ?? 0
        const opening = drink.stock
        const expected = opening + purchased
        lines[drink.id] = { openingStock: opening, purchased, closingStock: expected }
        sessionLines.push({
          user_id: user.id, session_id: session.id, drink_id: drink.id, drink_name: drink.name,
          opening_stock: opening, purchased, sold: 0, closing_stock: expected, revenue: 0, cost: drinkPurchaseCost(purchased, drink),
        })
        if (purchased > 0) stockUpdates.push(supabase.from('drinks').update({ stock: expected }).eq('id', drink.id))
      }

      const { error: linesError } = await supabase.from('session_lines').insert(sessionLines)
      if (linesError) throw linesError
      throwOnError(await Promise.all(stockUpdates))

      const closingMap: Record<string, number> = {}
      for (const drink of drinks) closingMap[drink.id] = lines[drink.id].closingStock

      setOpenSession(session)
      setLineStates(lines)
      setClosingCounts(closingMap)
      setStep('expenses')
      // Don't run loadData() here: it reloads *today's* state and would clobber
      // the freshly created session when it belongs to another date.
      await reloadDrinks()
      setTodayExpenses(await loadExpensesForDate(sessionDate))
    } catch (error) {
      console.error('Error saving purchases:', error)
      showAlert(t('common.error'), t('session.savePurchasesError'))
    } finally {
      setSaving(false)
    }
  }

  const goToSummary = () => {
    const defaults: Record<string, number> = { ...closingCounts }
    for (const drink of drinks) {
      if (defaults[drink.id] === undefined) defaults[drink.id] = getExpected(drink.id)
    }
    setClosingCounts(defaults)
    setStep('summary')
  }

  const closeSession = async () => {
    if (!openSession) return
    setSaving(true)
    try {
      const ops: any[] = []
      for (const drink of drinks) {
        const line = lineStates[drink.id]
        const opening = line?.openingStock ?? drink.stock
        const purchased = line?.purchased ?? purchases[drink.id] ?? 0
        const closing = closingCounts[drink.id] ?? drink.stock
        const sold = Math.max(0, opening + purchased - closing)
        ops.push(
          supabase.from('session_lines').update({ sold, closing_stock: closing, revenue: sold * drink.price, cost: drinkPurchaseCost(purchased, drink) })
            .eq('session_id', openSession.id).eq('drink_id', drink.id)
        )
        ops.push(supabase.from('drinks').update({ stock: closing }).eq('id', drink.id))
      }
      ops.push(
        supabase.from('sessions').update({ total_purchase: totalPurchaseCost, total_revenue: totalRevenue, total_cost: totalPurchaseCost, total_profit: netProfit, closed: true })
          .eq('id', openSession.id)
      )
      throwOnError(await Promise.all(ops))
      await clearSessionDraft()
      setSessionDate(todayStr)
      await loadData()
      const { data } = await supabase.from('sessions').select('*, session_lines (*)').eq('id', openSession.id).single()
      if (data) openJournal(data)
    } catch (error) {
      console.error('Error closing session:', error)
      showAlert(t('common.error'), t('session.closeError'))
    } finally {
      setSaving(false)
    }
  }

  const reopenForEdit = async (session: Session | null) => {
    if (!session) return
    showAlert(t('session.editSession'), t('session.reopenMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.reopen'),
        onPress: async () => {
          const { error } = await supabase.from('sessions').update({ closed: false }).eq('id', session.id)
          if (error) {
            showAlert(t('common.error'), t('session.reopenError'))
            return
          }
          // Hydrate the wizard from the reopened session's lines — loadData()
          // only rebuilds state for today's session, and this one can belong
          // to any calendar date.
          const { lines, purchasesMap, closingMap } = linesToState(session)
          setLineStates(lines)
          setPurchases(purchasesMap)
          setClosingCounts(closingMap)
          setOpenSession({ ...session, closed: false })
          if (session.date === todayStr) setClosedToday(null)
          setSessionDate(session.date)
          setTodayExpenses(await loadExpensesForDate(session.date))
          setStep('inventory')
        },
      },
    ])
  }

  const handleStepPress = (key: string) => {
    if (!openSession) return
    if (key === 'summary') goToSummary()
    else setStep(key as Step)
  }

  const filtered = drinks.filter(d => {
    if (!d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'Tout' && d.category !== categoryFilter) return false
    return true
  })

  // ── Purchases step: articles with non-zero purchases, then the rest
  const purchasedDrinks = filtered.filter(d => (purchases[d.id] ?? 0) > 0)
  const otherDrinks = filtered.filter(d => (purchases[d.id] ?? 0) === 0)
  const orderedDrinks = [...purchasedDrinks, ...otherDrinks]

  // ── Summary: only drinks with any activity
  const activeDrinks = drinks.filter(d => {
    const p = lineStates[d.id]?.purchased ?? purchases[d.id] ?? 0
    return getSold(d.id) > 0 || p > 0
  })
  const totalSold = activeDrinks.reduce((s, d) => s + getSold(d.id), 0)
  const totalPurchasedUnits = activeDrinks.reduce((s, d) => {
    return s + (lineStates[d.id]?.purchased ?? purchases[d.id] ?? 0)
  }, 0)

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ScreenHeader title={t('session.title')} subtitle={dateLabel(todayStr)} colors={colors} />
        <ScreenSkeleton variant="session" />
      </View>
    )
  }

  // ────────────────────────────── STEP: PURCHASES ──────────────────────────────
  const renderPurchasesStep = () => (
    <StepContent stepKey="purchases">
      <View style={[styles.stepHintBox, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="cube-outline" size={16} color={colors.primary} />
        <Text style={[styles.stepHintText, { color: colors.primary }]}>{t('session.purchasesHint')}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={[styles.searchBox, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.slate} />
          <TextInput
            style={[styles.searchInput, { color: colors.slateDark }]}
            placeholder={t('common.search')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.slate} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
        {categories.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.catChip, categoryFilter === cat && styles.catChipActive]}>
            <Text style={[styles.catChipText, categoryFilter === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView ref={purchasesScrollRef} style={{ flex: 1 }} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {purchasedDrinks.length > 0 && (
          <Text style={styles.groupLabel}>{t('session.deliveriesEntered', { count: purchasedDrinks.length })}</Text>
        )}
        {orderedDrinks.map(drink => {
          const rackSize = getRackSize(drink.id)
          const racksVal = toRacks(purchases[drink.id] ?? 0, drink.id)
          const unitsVal = purchases[drink.id] ?? 0
          const hasDelivery = unitsVal > 0
          // Once purchases are saved, drink.stock already includes them —
          // always display the stock as it was before today's deliveries.
          const opening = lineStates[drink.id]?.openingStock ?? drink.stock
          return (
            <View key={drink.id} style={[styles.purchaseCard, hasDelivery && styles.purchaseCardActive]}>
              <View style={styles.purchaseCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                  <Text style={styles.drinkCat}>{drink.category}</Text>
                </View>
                <View style={styles.stockTag}>
                  <Text style={styles.stockTagLabel}>{t('session.currentStock')}</Text>
                  <Text style={styles.stockTagValue}>{formatWithCassiers(opening, drink.category, getRackSize(drink.id))}</Text>
                </View>
              </View>

              <View style={styles.dividerLight} />

              <View style={styles.purchaseInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    {t('session.racksReceived')}{rackSize > 1 ? ` ${t('session.rackSizeHint', { size: rackSize })}` : ''}
                  </Text>
                  {hasDelivery && (
                    <Text style={styles.unitConversion}>
                      {t(racksVal > 1 ? 'session.conversionMany' : 'session.conversionOne', { racks: racksVal, units: unitsVal })}
                    </Text>
                  )}
                </View>
                <MiniStepper
                  value={racksVal}
                  onChange={v => {
                    const units = toUnits(v, drink.id)
                    const wasEmpty = (purchases[drink.id] ?? 0) === 0
                    setPurchases(prev => ({ ...prev, [drink.id]: units }))
                    // Item just moved into the top "delivered" group — scroll there so the
                    // user's focus follows it instead of losing their place in the list.
                    if (wasEmpty && units > 0) {
                      requestAnimationFrame(() => purchasesScrollRef.current?.scrollTo({ y: 0, animated: true }))
                    }
                  }}
                  colors={colors}
                />
              </View>

              {hasDelivery && (
                <View style={styles.afterDelivery}>
                  <Ionicons name="trending-up" size={14} color={colors.emerald} />
                  <Text style={styles.afterDeliveryText}>
                    {t('session.newStock', { value: formatWithCassiers(opening + unitsVal, drink.category, getRackSize(drink.id)) })}
                  </Text>
                </View>
              )}
            </View>
          )
        })}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={colors.slateLight} />
            <Text style={styles.emptyStateText}>{t('session.noItemsFound')}</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </StepContent>
  )

  // ─────────────────────────── STEP: EXPENSES ──────────────────────────────────
  const renderExpensesStep = () => (
    <StepContent stepKey="expenses">
      <View style={styles.stepHintBox}>
        <Ionicons name="receipt-outline" size={16} color={colors.primary} />
        <Text style={styles.stepHintText}>{t('session.expensesHint')}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        <SessionExpensesPanel
          date={openSession?.date ?? sessionDate}
          expenses={todayExpenses}
          onChange={async () => setTodayExpenses(await loadExpensesForDate(openSession?.date ?? sessionDate))}
        />
        <View style={{ height: 20 }} />
      </ScrollView>
    </StepContent>
  )

  // ─────────────────────────── STEP: INVENTORY ─────────────────────────────────
  const renderInventoryStep = () => (
    <StepContent stepKey="inventory">
      <View style={styles.stepHintBox}>
        <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
        <Text style={styles.stepHintText}>{t('session.inventoryHint')}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.slate} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.slate} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
        {categories.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.catChip, categoryFilter === cat && styles.catChipActive]}>
            <Text style={[styles.catChipText, categoryFilter === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {filtered.map(drink => {
          const opening = lineStates[drink.id]?.openingStock ?? drink.stock - (purchases[drink.id] ?? 0)
          const purchased = lineStates[drink.id]?.purchased ?? purchases[drink.id] ?? 0
          const expected = opening + purchased
          const closing = closingCounts[drink.id] ?? expected
          const sold = Math.max(0, expected - closing)
          const hasSales = sold > 0
          const rackSize = getRackSize(drink.id)
          const racksVal = toRacks(closing, drink.id)
          const unitsRemainder = closing % rackSize

          return (
            <View key={drink.id} style={[styles.inventoryCard, hasSales && styles.inventoryCardActive]}>
              <View style={[styles.inventoryMainRow, !isDesktop && styles.inventoryMainRowMobile]}>
                {/* Left: Stock info */}
                <View style={[styles.inventoryLeft, !isDesktop && styles.inventoryLeftMobile]}>
                  {isDesktop ? (
                    <>
                      <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                      {purchased > 0 ? (
                        <View style={styles.stockBreakdown}>
                          <View style={styles.stockItem}>
                            <Text style={styles.stockItemLabel}>{t('session.opening')}</Text>
                            <Text style={styles.stockItemValue}>{fmtNum(opening)}</Text>
                          </View>
                          <Text style={styles.stockOperator}>+</Text>
                          <View style={styles.stockItem}>
                            <Text style={styles.stockItemLabel}>{t('session.purchase')}</Text>
                            <Text style={[styles.stockItemValue, styles.stockItemValuePositive]}>{fmtNum(purchased)}</Text>
                          </View>
                          <Text style={styles.stockOperator}>=</Text>
                          <View style={[styles.stockItem, styles.stockItemTotal]}>
                            <Text style={styles.stockItemLabel}>Stock</Text>
                            <Text style={[styles.stockItemValue, styles.stockItemValueTotal]}>{fmtNum(expected)}</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.inventoryStockInfo}>{t('session.stockValue', { value: fmtNum(expected) })}</Text>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.mobileLeftInfo}>
                        <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                        {purchased > 0 && (
                          <View style={styles.mobileBreakdown}>
                            <View style={styles.stockItem}>
                              <Text style={styles.stockItemLabel}>{t('session.opening')}</Text>
                              <Text style={styles.mobileBreakdownValue}>{fmtNum(opening)}</Text>
                            </View>
                            <Text style={styles.mobileBreakdownOperator}>+</Text>
                            <View style={styles.stockItem}>
                              <Text style={styles.stockItemLabel}>{t('session.purchase')}</Text>
                              <Text style={[styles.mobileBreakdownValue, styles.mobileBreakdownValuePositive]}>{fmtNum(purchased)}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={styles.mobileStockTotal}>
                        <Text style={styles.mobileStockTotalLabel}>Stock</Text>
                        <Text style={styles.mobileStockTotalValue}>{fmtNum(expected)}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Mobile divider */}
                {!isDesktop && <View style={styles.inventoryDivider} />}

                {/* Right: Counting controls */}
                <View style={styles.inventoryRight}>
                  <Text style={styles.countingLabel}>{t('session.countedStock')}</Text>
                  <View style={styles.countingStepper}>
                    <View style={styles.stepperGroup}>
                      <Text style={styles.stepperLabel}>{t('session.racks')}</Text>
                      <MiniStepper
                        value={racksVal}
                        onChange={v => {
                          const newClosing = toUnits(v, drink.id) + unitsRemainder
                          setClosingCounts(prev => ({ ...prev, [drink.id]: newClosing }))
                        }}
                        colors={colors}
                      />
                    </View>
                    <View style={styles.stepperGroup}>
                      <Text style={styles.stepperLabel}>{t('session.unitsLabel')}</Text>
                      <MiniStepper
                        value={unitsRemainder}
                        onChange={v => {
                          const newClosing = toUnits(racksVal, drink.id) + v
                          setClosingCounts(prev => ({ ...prev, [drink.id]: newClosing }))
                        }}
                        max={rackSize - 1}
                        colors={colors}
                      />
                    </View>
                  </View>
                  {closing !== expected && (
                    <Text style={styles.countTotal}>
                      {t('session.totalUnits', { count: closing })} {rackSize > 1 && t('session.rackShortHint', { size: rackSize })}
                    </Text>
                  )}
                </View>
              </View>

              {/* Result - always render to prevent layout shifts, hide with opacity */}
              <View style={[styles.soldResult, !hasSales && styles.soldResultHidden]}>
                <View style={styles.soldResultLeft}>
                  <Text style={styles.soldResultLabel}>{t('session.soldLabel')}</Text>
                  <Text style={styles.soldResultQty}>{formatWithCassiers(sold, drink.category, getRackSize(drink.id))}</Text>
                </View>
                <Text style={styles.soldResultRevenue} numberOfLines={1}>{fmt(sold * drink.price)}</Text>
              </View>
            </View>
          )
        })}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={colors.slateLight} />
            <Text style={styles.emptyStateText}>{t('session.noItemsFound')}</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </StepContent>
  )

  // ──────────────────────────── STEP: SUMMARY ──────────────────────────────────
  const renderSummaryStep = () => (
    <StepContent stepKey="summary">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.summaryContent}
        keyboardShouldPersistTaps="handled"
        // @ts-ignore - web-only className prop
        className="recap-print-container"
      >

        {/* PDF Export button - positioned at top to export entire recap */}
        {Platform.OS === 'web' && closedToday && (
          <View style={styles.printSection}>
            <TouchableOpacity
              style={styles.printRecapBtn}
              onPress={async () => {
                if (closedToday?.id) {
                  await generatePdf('session', closedToday.id, userName)
                }
              }}
            >
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={styles.printRecapBtnText}>Exporter PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* P&L Hero */}
        <View style={styles.plHero}>
          <Text style={styles.plHeroTitle}>{t('session.dayResult')}</Text>
          <Text style={[styles.plHeroNet, { color: netProfit >= 0 ? colors.emerald : colors.rose }]}>
            {fmt(netProfit)}
          </Text>
          <Text style={styles.plHeroLabel}>{t('session.netResult')}</Text>

          <View style={styles.plHeroStats}>
            <StatPill label={t('session.revenue')} value={fmt(totalRevenue)} accent={colors.primary} colors={colors} />
            <StatPill label={t('session.purchasesLabel')} value={fmt(totalPurchaseCost)} accent={colors.rose} colors={colors} />
            <StatPill label={t('session.expensesLabel')} value={fmt(totalExpenses)} accent={colors.amber} colors={colors} />
          </View>
        </View>

        {/* P&L breakdown */}
        <View style={styles.plCard}>
          <Text style={styles.sectionTitle}>{t('session.incomeStatement')}</Text>
          <PLRow label={t('session.salesRevenue')} value={fmt(totalRevenue)} colors={colors} />
          <PLRow label={t('session.unitsSold')} value={fmtNum(totalSold)} muted colors={colors} />
          <PLRow label={t('session.purchaseCost')} value={`-${fmt(totalPurchaseCost)}`} negative colors={colors} />
          <View style={[styles.plDivider, { backgroundColor: colors.border }]} />
          <PLRow label={t('session.grossMargin')} value={fmt(grossProfit)} highlight accent={grossProfit >= 0 ? colors.primary : colors.rose} colors={colors} />
          <PLRow label={t('session.operatingExpenses')} value={`-${fmt(totalExpenses)}`} negative colors={colors} />
          <View style={[styles.plDivider, { backgroundColor: colors.border }]} />
          <PLRow label={t('session.netResult')} value={fmt(netProfit)} bold accent={netProfit >= 0 ? colors.emerald : colors.rose} colors={colors} />
        </View>

        {/* Comprehensive stock movement table */}
        {activeDrinks.length > 0 && (
          <View style={styles.tableCard}>
            <View style={styles.tableCardHeader}>
              <Text style={styles.sectionTitle}>{t('session.stockMovements')}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{t('session.itemsCount', { count: activeDrinks.length })}</Text>
              </View>
            </View>

            {/* Scrollable table container for mobile */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.tableScrollContainer}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableWrapper}>
                {/* Table header */}
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.thArticle]} numberOfLines={1}>{t('session.thArticle')}</Text>
                  <Text style={[styles.th, styles.thNum]} numberOfLines={1}>{t('session.thStart')}</Text>
                  <Text style={[styles.th, styles.thNum]} numberOfLines={1}>{t('session.thReceived')}</Text>
                  <Text style={[styles.th, styles.thNum]} numberOfLines={1}>{t('session.thAvailable')}</Text>
                  <Text style={[styles.th, styles.thNum]} numberOfLines={1}>{t('session.thCounted')}</Text>
                  <Text style={[styles.th, styles.thNum, styles.thAccent]} numberOfLines={1}>{t('session.soldLabel')}</Text>
                  <Text style={[styles.th, styles.thMoney]} numberOfLines={1}>Revenu</Text>
                </View>

                {activeDrinks.map((drink, i) => {
                  const opening = lineStates[drink.id]?.openingStock ?? drink.stock - (purchases[drink.id] ?? 0)
                  const purchased = lineStates[drink.id]?.purchased ?? purchases[drink.id] ?? 0
                  const expected = opening + purchased
                  const closing = closingCounts[drink.id] ?? expected
                  const sold = getSold(drink.id)
                  return (
                    <View key={drink.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                      <Text style={[styles.td, styles.tdArticle]} numberOfLines={1}>{drink.name}</Text>
                      <Text style={[styles.td, styles.tdNum]} numberOfLines={1}>{fmtNum(opening)}</Text>
                      <Text style={[styles.td, styles.tdNum, purchased > 0 && styles.tdPositive]} numberOfLines={1}>
                        {purchased > 0 ? `+${fmtNum(purchased)}` : '—'}
                      </Text>
                      <Text style={[styles.td, styles.tdNum]} numberOfLines={1}>{fmtNum(expected)}</Text>
                      <Text style={[styles.td, styles.tdNum]} numberOfLines={1}>{fmtNum(closing)}</Text>
                      <Text style={[styles.td, styles.tdNum, sold > 0 && styles.tdAccent]} numberOfLines={1}>{fmtNum(sold)}</Text>
                      <Text style={[styles.td, styles.tdMoney]} numberOfLines={1}>{sold > 0 ? fmt(sold * drink.price) : '—'}</Text>
                    </View>
                  )
                })}

                {/* Total row */}
                <View style={styles.tableTotalRow}>
                  <Text style={[styles.tdTotal, styles.tdArticle]} numberOfLines={1}>{t('session.thTotal')}</Text>
                  <Text style={[styles.tdTotal, styles.tdNum]} numberOfLines={1}>—</Text>
                  <Text style={[styles.tdTotal, styles.tdNum, styles.tdPositive]} numberOfLines={1}>
                    {totalPurchasedUnits > 0 ? `+${fmtNum(totalPurchasedUnits)}` : '—'}
                  </Text>
                  <Text style={[styles.tdTotal, styles.tdNum]} numberOfLines={1}>—</Text>
                  <Text style={[styles.tdTotal, styles.tdNum]} numberOfLines={1}>—</Text>
                  <Text style={[styles.tdTotal, styles.tdNum, styles.tdAccent]} numberOfLines={1}>{fmtNum(totalSold)}</Text>
                  <Text style={[styles.tdTotal, styles.tdMoney, { color: colors.primary }]} numberOfLines={1}>{fmt(totalRevenue)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {activeDrinks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={colors.slateLight} />
            <Text style={styles.emptyStateText}>{t('session.noActivity')}</Text>
          </View>
        )}

        {/* Expenses — tied to the active session's date, not necessarily today */}
        <SessionExpensesPanel
          date={openSession?.date ?? sessionDate}
          expenses={todayExpenses}
          onChange={async () => setTodayExpenses(await loadExpensesForDate(openSession?.date ?? sessionDate))}
        />
        <View style={{ height: 24 }} />
      </ScrollView>
    </StepContent>
  )

  // ────────────────────────── STEP: DONE ──────────────────────────────────────
  const renderDoneStep = () => (
    <StepContent stepKey="done">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Calendar */}
        <View style={styles.calendarWrap}>
          <Calendar
            current={selectedDate}
            onDayPress={day => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            style={{ paddingBottom: isDesktop ? 12 : 4 }}
            theme={{
              calendarBackground: colors.white,
              textSectionTitleColor: colors.slate,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
              todayTextColor: colors.primary,
              dayTextColor: colors.slateDark,
              textDisabledColor: colors.slateLight,
              arrowColor: colors.primary,
              monthTextColor: colors.slateDark,
              textMonthFontFamily: FONT.bold,
              textDayFontFamily: FONT.regular,
              textDayHeaderFontFamily: FONT.semibold,
              textDayFontSize: isDesktop ? 15 : 14,
              textMonthFontSize: isDesktop ? 18 : 16,
              textDayHeaderFontSize: isDesktop ? 13 : 12,
              'stylesheet.calendar.header': {
                week: {
                  marginTop: isDesktop ? 8 : 4,
                  marginBottom: isDesktop ? 8 : 4,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              'stylesheet.calendar.main': {
                week: {
                  marginTop: isDesktop ? 2 : 0,
                  marginBottom: isDesktop ? 6 : 3,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              'stylesheet.day.basic': {
                base: {
                  width: isDesktop ? 48 : 40,
                  height: isDesktop ? 48 : 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                text: {
                  marginTop: isDesktop ? 4 : 2,
                  fontSize: isDesktop ? 15 : 14,
                  fontFamily: FONT.regular,
                  color: colors.slateDark,
                },
                today: {
                  backgroundColor: 'transparent',
                },
                todayText: {
                  color: colors.primary,
                  fontFamily: FONT.bold,
                },
                selected: {
                  backgroundColor: colors.primary,
                  borderRadius: isDesktop ? 24 : 20,
                },
                selectedText: {
                  color: colors.white,
                  fontFamily: FONT.bold,
                },
              },
            } as any}
          />
        </View>

        {/* Status card for selected date */}
        <View style={styles.dateStatusCard}>
            <View style={styles.dateStatusHeader}>
              <Text style={styles.dateStatusTitle}>{dateLabelLong(selectedDate)}</Text>
              {selectedDate === todayStr && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillText}>{t('session.todayLabel')}</Text>
                </View>
              )}
            </View>

            {selectedDateSession.closed ? (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: colors.emeraldLight }]}>
                    <Ionicons name="checkmark" size={18} color={colors.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{t('session.sessionClosed')}</Text>
                    <Text style={styles.statusSub}>
                      {t('session.closedStatusSub', { revenue: fmt(selectedDateSession.closed.total_revenue), net: fmt(selectedDateSession.closed.total_profit) })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => openJournal(selectedDateSession.closed!)}
                  // @ts-ignore - web-only className
                  className="glass-primary"
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.white} />
                  <Text style={styles.primaryBtnText}>{t('session.viewJournal')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => reopenForEdit(selectedDateSession.closed)}
                  // @ts-ignore - web-only className
                  className="glass-button"
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>{t('session.editSession')}</Text>
                </TouchableOpacity>
              </View>
            ) : selectedDateSession.open ? (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: colors.amberLight }]}>
                    <Ionicons name="time" size={18} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{t('session.sessionInProgress')}</Text>
                    <Text style={styles.statusSub}>{t('session.continueInventory')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    setOpenSession(selectedDateSession.open)
                    setSessionDate(selectedDateSession.open!.date)
                    setStep('inventory')
                  }}
                  // @ts-ignore - web-only className
                  className="glass-primary"
                >
                  <Ionicons name="play" size={18} color={colors.white} />
                  <Text style={styles.primaryBtnText}>{t('session.resume')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: colors.slateLight }]}>
                    <Ionicons name="add" size={18} color={colors.slate} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{t('session.noSession')}</Text>
                    <Text style={styles.statusSub}>{t('session.startForDate')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => startNewSession(selectedDate)}
                  // @ts-ignore - web-only className
                  className="glass-primary"
                >
                  <Ionicons name="add" size={18} color={colors.white} />
                  <Text style={styles.primaryBtnText}>{t('session.startSession')}</Text>
                </TouchableOpacity>
              </View>
            )}
        </View>

        {/* Mobile: new session button */}
        {!isDesktop && !closedToday && !openSession && (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginHorizontal: 16, marginTop: 16 }]}
            onPress={() => startNewSession(todayStr)}
            // @ts-ignore - web-only className
            className="glass-primary"
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>{t('session.startTodaySession')}</Text>
          </TouchableOpacity>
        )}

        {/* Past sessions list */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>{t('session.recentSessions')}</Text>
          {pastSessions.slice(0, 15).map((s, i) => (
            <TouchableOpacity key={s.id} style={[styles.historyRow, i === 0 && { borderTopWidth: 0 }]} onPress={() => openJournal(s)}>
              <View style={[styles.historyDot, { backgroundColor: s.closed ? colors.emeraldLight : colors.amberLight }]}>
                <Ionicons name={s.closed ? 'checkmark' : 'time'} size={12} color={s.closed ? colors.emerald : colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>{dateLabelLong(s.date)}</Text>
                <Text style={styles.historyMeta}>{t('session.unitsSoldCount', { count: fmtNum(s.session_lines?.reduce((a, l) => a + l.sold, 0) ?? 0) })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={styles.historyRevenue}>{fmt(s.total_revenue)}</Text>
                <Text style={[styles.historyNet, { color: s.total_profit >= 0 ? colors.emerald : colors.rose }]}>
                  {s.total_profit >= 0 ? '+' : ''}{fmt(s.total_profit)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.slateLight} />
            </TouchableOpacity>
          ))}
          {pastSessions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={colors.slateLight} />
              <Text style={styles.emptyStateText}>{t('session.noClosedSessions')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </StepContent>
  )

  // ───────────────────────────── FOOTER ────────────────────────────────────────
  const renderFooter = () => {
    if (step === 'done') return null

    const btns: { label: string; secondary?: boolean; onPress: () => void; loading?: boolean }[] = []

    if (step === 'purchases') {
      btns.push({ label: t('common.skip'), secondary: true, onPress: savePurchases })
      btns.push({ label: saving ? '' : t('common.continue'), onPress: savePurchases, loading: saving })
    } else if (step === 'expenses') {
      btns.push({ label: t('session.backToPurchases'), secondary: true, onPress: () => setStep('purchases') })
      btns.push({ label: t('session.countInventory'), onPress: () => setStep('inventory') })
    } else if (step === 'inventory') {
      btns.push({ label: t('session.backToExpenses'), secondary: true, onPress: () => setStep('expenses') })
      btns.push({ label: t('session.viewSummary'), onPress: goToSummary })
    } else if (step === 'summary') {
      btns.push({ label: t('session.backLabel'), secondary: true, onPress: () => setStep('inventory') })
      btns.push({ label: saving ? '' : t('session.closeDay'), onPress: closeSession, loading: saving })
    }

    return (
      <View style={styles.footer}>
        {btns.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.footerBtn, b.secondary ? styles.footerBtnSecondary : styles.footerBtnPrimary, (b.loading) && { opacity: 0.7 }]}
            onPress={b.onPress}
            disabled={b.loading}
            // @ts-ignore - web-only className
            className={b.secondary ? "glass-button" : "glass-primary"}
          >
            {b.loading
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={b.secondary ? styles.footerBtnSecondaryText : styles.footerBtnPrimaryText}>{b.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  // ───────────────────────── MAIN CONTENT ──────────────────────────────────────
  const content = (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScreenHeader
        title={step === 'done' || sessionDate === todayStr ? t('session.titleToday') : t('session.title')}
        subtitle={dateLabel(step === 'done' ? todayStr : (openSession?.date ?? sessionDate))}
        onBack={step !== 'done' ? () => setStep('done') : undefined}
        colors={colors}
        right={step === 'done' && !isDesktop ? (
          <TouchableOpacity onPress={() => {
            const s = closedToday ?? openSession ?? pastSessions[0]
            if (s) openJournal(s)
          }} style={{ padding: 4 }}>
            <Ionicons name="journal-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : undefined}
      />

      {step !== 'done' && (
        <ModernStepIndicator steps={STEPS} current={step} onStepPress={openSession ? handleStepPress : undefined} colors={colors} />
      )}

      {step === 'purchases' && renderPurchasesStep()}
      {step === 'expenses' && renderExpensesStep()}
      {step === 'inventory' && renderInventoryStep()}
      {step === 'summary' && renderSummaryStep()}
      {step === 'done' && renderDoneStep()}

      {renderFooter()}
    </View>
  )

  // Desktop split view (journal detail alongside)
  if (isDesktop && step === 'done') {
    return (
      <>
        <View style={styles.desktopSplit}>
          <View style={[styles.desktopLeft, !selectedSessionId && { flex: 1 }]}>
            {content}
          </View>
          {selectedSessionId && (
            <View style={styles.desktopRight}>
              <SessionDetailScreen
                route={{ params: { sessionId: selectedSessionId } } as any}
                navigation={{ ...navigation, goBack: () => setSelectedSessionId(null) } as any}
              />
            </View>
          )}
        </View>
        <LoadingModal
          visible={pdfLoading}
          message="Génération du PDF en cours..."
          progress={pdfProgress}
          colors={colors}
        />
      </>
    )
  }

  return (
    <>
      {content}
      <LoadingModal
        visible={pdfLoading}
        message="Génération du PDF en cours..."
        progress={pdfProgress}
        colors={colors}
      />
    </>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────────────
function PLRow({
  label, value, muted, negative, highlight, bold, accent, colors,
}: {
  label: string; value: string; muted?: boolean; negative?: boolean
  highlight?: boolean; bold?: boolean; accent?: string; colors: typeof LIGHT_COLORS
}) {
  return (
    <View style={[plr.row, highlight && { backgroundColor: colors.primaryLight + '40', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 8 }]}>
      <Text style={[plr.label, { color: colors.slate }, muted && { fontSize: 12, color: colors.slate }]}>{label}</Text>
      <Text style={[plr.value, { color: colors.slateDark }, bold && plr.bold, negative && { color: colors.rose }, accent ? { color: accent } : {}]}>
        {value}
      </Text>
    </View>
  )
}
const plr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  label: { fontSize: 14, fontFamily: FONT.regular, flex: 1 },
  value: { fontSize: 14, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
  bold: { fontSize: 16, fontFamily: FONT.bold },
})

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: typeof LIGHT_COLORS) => StyleSheet.create({
  container: { flex: 1 },

  // step hint
  stepHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepHintText: { flex: 1, fontSize: 12, fontFamily: FONT.regular, color: colors.primary, lineHeight: 16 },

  // search + filter
  toolbar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: colors.slateDark },
  catScroll: { maxHeight: 38 },
  catScrollContent: { gap: 6, paddingHorizontal: 12, paddingVertical: 4 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontFamily: FONT.semibold, color: colors.slate },
  catChipTextActive: { color: colors.white },

  listContent: { paddingHorizontal: 12, paddingTop: 4 },
  groupLabel: { fontSize: 12, fontFamily: FONT.bold, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },

  // PURCHASE CARDS
  purchaseCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  purchaseCardActive: {
    borderColor: colors.primary,
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(24,119,242,0.12)' } }),
  },
  purchaseCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  drinkName: { fontSize: 15, fontFamily: FONT.semibold, color: colors.slateDark, marginBottom: 2, flexShrink: 1 },
  drinkCat: { fontSize: 11, fontFamily: FONT.medium, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.5 },
  stockTag: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slateLight,
    minWidth: 70,
  },
  stockTagLabel: { fontSize: 9, fontFamily: FONT.bold, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  stockTagValue: { fontSize: 12, fontFamily: FONT.bold, color: colors.slateDark },
  dividerLight: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  purchaseInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputLabel: { fontSize: 12, fontFamily: FONT.medium, color: colors.slate, marginBottom: 2 },
  unitConversion: { fontSize: 11, fontFamily: FONT.regular, color: colors.primary, marginTop: 2 },
  afterDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  afterDeliveryText: { fontSize: 12, fontFamily: FONT.semibold, color: colors.emerald },

  // INVENTORY CARDS
  inventoryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  inventoryCardActive: {
    borderColor: colors.primary + '60',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(24,119,242,0.1)' } }),
  },
  inventoryMainRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  inventoryMainRowMobile: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'stretch',
  },
  inventoryLeft: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 60,
  },
  inventoryLeftMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mobileLeftInfo: {
    flex: 1,
    gap: 4,
  },
  mobileBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  mobileBreakdownValue: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
    fontVariant: ['tabular-nums'],
  },
  mobileBreakdownValuePositive: {
    color: colors.emerald,
  },
  mobileBreakdownOperator: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: colors.slate,
    marginHorizontal: 2,
  },
  mobileStockTotal: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.slateLight + '40',
    borderRadius: 8,
  },
  mobileStockTotalLabel: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  mobileStockTotalValue: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: colors.slateDark,
    fontVariant: ['tabular-nums'],
  },
  inventoryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  inventoryRight: {
    borderWidth: 1.5,
    borderColor: colors.primary + '20',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: colors.primaryLight + '15',
    minWidth: 280,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(24,119,242,0.08)' },
      default: { alignSelf: 'stretch', minWidth: 0 }
    }),
  },
  inventoryStockInfo: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: colors.slate,
    marginTop: 3
  },
  stockBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  stockItem: {
    alignItems: 'center',
    gap: 1,
  },
  stockItemTotal: {
    backgroundColor: colors.slateLight + '40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockItemLabel: {
    fontSize: 8,
    fontFamily: FONT.medium,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stockItemValue: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
    fontVariant: ['tabular-nums'],
  },
  stockItemValuePositive: {
    color: colors.emerald,
  },
  stockItemValueTotal: {
    color: colors.slateDark,
    fontSize: 12,
  },
  stockOperator: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: colors.slate,
    marginHorizontal: 1,
  },
  countingLabel: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  countingStepper: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'nowrap',
  },
  stepperGroup: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stepperLabel: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: colors.slateDark
  },
  countTotal: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 2
  },

  soldResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  soldResultHidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  soldResultLeft: { flex: 1 },
  soldResultLabel: { fontSize: 10, fontFamily: FONT.bold, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  soldResultQty: { fontSize: 13, fontFamily: FONT.semibold, color: colors.slateDark },
  soldResultRevenue: { fontSize: 15, fontFamily: FONT.bold, color: colors.emerald, fontVariant: ['tabular-nums'] },

  // SUMMARY
  summaryContent: { padding: 12 },
  plHero: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } }),
  },
  plHeroTitle: { fontSize: 13, fontFamily: FONT.bold, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  plHeroNet: { fontSize: 36, fontFamily: FONT.extrabold, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  plHeroLabel: { fontSize: 12, fontFamily: FONT.regular, color: colors.slate, marginTop: 2, marginBottom: 16 },
  plHeroStats: { flexDirection: 'row', gap: 8, width: '100%' },

  plCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, color: colors.slateDark, marginBottom: 12 },
  plDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },

  // comprehensive table
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 0 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.primaryLight },
  countBadgeText: { fontSize: 12, fontFamily: FONT.bold, color: colors.primary },
  tableScrollContainer: {
    width: '100%',
  },
  tableScrollContent: {
    paddingHorizontal: 0,
    // On web let the scroll content fill the card so the flex columns stretch to the
    // full container width instead of shrinking to their content (which left a big gap).
    ...Platform.select({ web: { flexGrow: 1, width: '100%' } }),
  },
  tableWrapper: {
    minWidth: '100%',
    ...Platform.select({ web: { width: '100%' } }),
  },

  // Print section styles
  printSection: {
    alignItems: 'flex-end',
    marginBottom: 16,
    ...Platform.select({ web: { '@media print': { display: 'none' } } }),
  },
  printRecapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    ...Platform.select({ web: { cursor: 'pointer', boxShadow: '0 2px 8px rgba(24,119,242,0.15)' } }),
  },
  printRecapBtnText: { fontSize: 14, fontFamily: FONT.semibold, color: colors.primary },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: { fontSize: 9, fontFamily: FONT.bold, color: colors.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  // On web the columns flex to fill the container (no right-side gap); on native they keep
  // fixed widths so the table can scroll horizontally on narrow phones.
  thArticle: { paddingRight: 12, ...Platform.select({ web: { flexGrow: 2.2, flexShrink: 1, flexBasis: 0, minWidth: 110 }, default: { width: 120, minWidth: 120 } }) },
  thNum: { textAlign: 'right', paddingHorizontal: 6, ...Platform.select({ web: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 52 }, default: { width: 50, minWidth: 50 } }) },
  thMoney: { textAlign: 'right', paddingHorizontal: 6, ...Platform.select({ web: { flexGrow: 1.5, flexShrink: 1, flexBasis: 0, minWidth: 90 }, default: { width: 70, minWidth: 70 } }) },
  thAccent: { color: colors.primary },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  tableRowEven: { backgroundColor: colors.surface + '60' },
  td: { fontSize: 11, fontFamily: FONT.medium, color: colors.slateDark },
  tdArticle: { paddingRight: 12, ...Platform.select({ web: { flexGrow: 2.2, flexShrink: 1, flexBasis: 0, minWidth: 110 }, default: { width: 120, minWidth: 120 } }) },
  tdNum: { textAlign: 'right', fontFamily: FONT.semibold, fontVariant: ['tabular-nums'], paddingHorizontal: 6, ...Platform.select({ web: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 52 }, default: { width: 50, minWidth: 50 } }) },
  tdMoney: { textAlign: 'right', fontFamily: FONT.bold, color: colors.primary, fontVariant: ['tabular-nums'], fontSize: 10, paddingHorizontal: 6, ...Platform.select({ web: { flexGrow: 1.5, flexShrink: 1, flexBasis: 0, minWidth: 90 }, default: { width: 70, minWidth: 70 } }) },
  tdPositive: { color: colors.primary },
  tdAccent: { color: colors.primary },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primaryLight + '50',
    borderTopWidth: 1.5,
    borderTopColor: colors.primary + '40',
    alignItems: 'center',
  },
  tdTotal: { fontSize: 13, fontFamily: FONT.bold, color: colors.slateDark },

  // DONE / HISTORY
  calendarWrap: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingBottom: 16,
  },
  dateStatusCard: {
    backgroundColor: colors.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateStatusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dateStatusTitle: { fontSize: 16, fontFamily: FONT.bold, color: colors.slateDark, flex: 1, marginRight: 8 },
  todayPill: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: 20 },
  todayPillText: { fontSize: 11, fontFamily: FONT.bold, color: colors.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontFamily: FONT.semibold, color: colors.slateDark },
  statusSub: { fontSize: 12, fontFamily: FONT.regular, color: colors.slate, marginTop: 2 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(24,119,242,0.25)', cursor: 'pointer' } }),
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: colors.primary,
  },
  primaryBtnText: { fontSize: 15, fontFamily: FONT.semibold, color: colors.white },

  historySection: {
    backgroundColor: colors.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historySectionTitle: { fontSize: 15, fontFamily: FONT.bold, color: colors.slateDark, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  historyDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyDate: { fontSize: 13, fontFamily: FONT.semibold, color: colors.slateDark },
  historyMeta: { fontSize: 11, fontFamily: FONT.regular, color: colors.slate, marginTop: 1 },
  historyRevenue: { fontSize: 14, fontFamily: FONT.bold, color: colors.slateDark, fontVariant: ['tabular-nums'] },
  historyNet: { fontSize: 12, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },

  // FOOTER
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({ web: { boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' } }),
  },
  footerBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerBtnPrimary: {
    backgroundColor: colors.primary,
    flex: 2,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(24,119,242,0.25)' } }),
  },
  footerBtnSecondary: { backgroundColor: colors.slateLight },
  footerBtnPrimaryText: { fontSize: 14, fontFamily: FONT.bold, color: colors.white },
  footerBtnSecondaryText: { fontSize: 14, fontFamily: FONT.semibold, color: colors.slate },

  // desktop split
  desktopSplit: { flex: 1, flexDirection: 'row', backgroundColor: colors.surface },
  desktopLeft: { width: '42%', backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  desktopRight: {
    flex: 1,
    backgroundColor: colors.white,
    ...Platform.select({ web: { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' } }),
  },
  desktopCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },

  // shared
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyStateText: { fontSize: 14, fontFamily: FONT.regular, color: colors.slate },
})
