import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { supabase } from '../lib/supabase'
import { Drink, Category, Session, Expense } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { ScreenSkeleton } from '../components/Skeleton'
import SessionDetailScreen from './SessionDetailScreen'
import {
  COLORS,
  FONT,
  fmt,
  fmtNum,
  today,
  dateLabel,
  dateLabelLong,
  formatWithCassiers,
} from '../utils/helpers'

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui",
}
LocaleConfig.defaultLocale = 'fr'

type Step = 'purchases' | 'inventory' | 'summary' | 'done'

const STEPS = [
  { key: 'purchases', label: 'Achats' },
  { key: 'inventory', label: 'Inventaire' },
  { key: 'summary', label: 'Récap' },
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
}: {
  steps: { key: string; label: string }[]
  current: string
  onStepPress?: (key: string) => void
}) {
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
    <View style={si.container}>
      {/* progress bar track */}
      <View style={si.track}>
        <Animated.View style={[si.fill, { width: barWidth }]} />
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
              <View style={[si.dot, done && si.dotDone, active && si.dotActive]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  : <Text style={[si.dotNum, active && si.dotNumActive]}>{i + 1}</Text>}
              </View>
              <Text style={[si.labelText, active && si.labelTextActive, done && si.labelTextDone]}>
                {step.label}
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
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.slateLight,
    borderRadius: 2,
    marginBottom: 12,
  },
  fill: {
    height: 3,
    backgroundColor: COLORS.primary,
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
    backgroundColor: COLORS.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    ...Platform.select({ web: { boxShadow: '0 0 0 4px rgba(24,119,242,0.15)' } }),
  },
  dotDone: {
    backgroundColor: COLORS.emerald,
  },
  dotNum: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: COLORS.slate,
  },
  dotNumActive: {
    color: COLORS.white,
  },
  labelText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    textAlign: 'center',
  },
  labelTextActive: {
    color: COLORS.primary,
    fontFamily: FONT.bold,
  },
  labelTextDone: {
    color: COLORS.emerald,
  },
})

// ─── Mini stepper (for inline use) ───────────────────────────────────────────
function MiniStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <View style={ms.row}>
      <TouchableOpacity
        style={[ms.btn, ms.btnMinus, value <= min && ms.btnDisabled]}
        onPress={() => value > min && onChange(value - 1)}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={18} color={value <= min ? COLORS.slate : COLORS.rose} />
      </TouchableOpacity>
      <TextInput
        style={ms.input}
        value={value.toString()}
        onChangeText={t => { const n = parseInt(t) || 0; if (n >= min && n <= max) onChange(n) }}
        keyboardType="number-pad"
        selectTextOnFocus
      />
      <TouchableOpacity
        style={[ms.btn, ms.btnPlus, value >= max && ms.btnDisabled]}
        onPress={() => value < max && onChange(value + 1)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  )
}

const ms = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMinus: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  btnPlus: {
    backgroundColor: COLORS.primary,
  },
  btnDisabled: { opacity: 0.35 },
  input: {
    width: 56,
    height: 36,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    textAlign: 'center',
    backgroundColor: COLORS.white,
  },
})

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[sp.wrap, accent ? { borderColor: accent, backgroundColor: accent + '12' } : {}]}>
      <Text style={[sp.label, accent ? { color: accent } : {}]}>{label}</Text>
      <Text style={[sp.value, accent ? { color: accent } : {}]}>{value}</Text>
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  label: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  value: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    fontVariant: ['tabular-nums'],
  },
})

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SessionScreen({ navigation }: any) {
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [selectedDateSession, setSelectedDateSession] = useState<{ closed: Session | null; open: Session | null }>({ closed: null, open: null })

  const categories: Array<Category | 'Tout'> = ['Tout', 'Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']
  const todayStr = today()
  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  const markedDates = useMemo(() => {
    const marks: any = {}
    allSessions.forEach(s => {
      marks[s.date] = { marked: true, dotColor: s.closed ? COLORS.emerald : COLORS.amber }
    })
    if (selectedDate) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: COLORS.primary }
    }
    return marks
  }, [allSessions, selectedDate])

  const getRackSize = (drinkId: string) => drinks.find(d => d.id === drinkId)?.rack_size || 1
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

  const loadData = useCallback(async () => {
    try {
      const { data: drinksData } = await supabase.from('drinks').select('*').eq('active', true).order('name')
      setDrinks(drinksData || [])

      const { closed, open } = await loadDataForDate(todayStr)
      setClosedToday(closed)
      setOpenSession(open)

      if (closed && !open) {
        setStep('done')
      } else if (open?.session_lines?.length) {
        const lines: Record<string, LineState> = {}
        const purchasesMap: Record<string, number> = {}
        const closingMap: Record<string, number> = {}
        for (const line of open.session_lines) {
          lines[line.drink_id] = { openingStock: line.opening_stock, purchased: line.purchased, closingStock: line.closing_stock }
          purchasesMap[line.drink_id] = line.purchased
          closingMap[line.drink_id] = line.closing_stock
        }
        setLineStates(lines)
        setPurchases(purchasesMap)
        setClosingCounts(closingMap)
        setStep(prev => (prev === 'summary' || prev === 'inventory' ? prev : 'inventory'))
      } else if (!open && !closed) {
        setStep('purchases')
        setPurchases({})
        setClosingCounts({})
        setLineStates({})
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

  const getSold = (drinkId: string) => {
    const expected = getExpected(drinkId)
    const closing = closingCounts[drinkId] ?? expected
    return Math.max(0, expected - closing)
  }

  const totalRevenue = drinks.reduce((s, d) => s + getSold(d.id) * d.price, 0)
  const totalPurchaseCost = drinks.reduce((s, d) => {
    const p = lineStates[d.id]?.purchased ?? purchases[d.id] ?? 0
    return s + p * d.cost
  }, 0)
  const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalRevenue - totalPurchaseCost
  const netProfit = grossProfit - totalExpenses

  const openJournal = (session: Session) => {
    if (isDesktop) setSelectedSessionId(session.id)
    else navigation.navigate('SessionDetail', { sessionId: session.id })
  }

  const startNewSession = async (date: string) => {
    setSelectedDate(date)
    setStep('purchases')
    setPurchases({})
    setClosingCounts({})
    setLineStates({})
    if (date !== todayStr) await loadDataForDate(date)
  }

  const savePurchases = async () => {
    setSaving(true)
    try {
      if (openSession) {
        const ops: any[] = []
        for (const drink of drinks) {
          const newPurchased = purchases[drink.id] ?? 0
          const oldLine = lineStates[drink.id]
          const oldPurchased = oldLine?.purchased ?? 0
          const opening = oldLine?.openingStock ?? drink.stock - oldPurchased
          const delta = newPurchased - oldPurchased
          const expected = opening + newPurchased
          ops.push(
            supabase.from('session_lines').update({ purchased: newPurchased, closing_stock: expected, cost: newPurchased * drink.cost })
              .eq('session_id', openSession.id).eq('drink_id', drink.id)
          )
          if (delta !== 0) ops.push(supabase.from('drinks').update({ stock: drink.stock + delta }).eq('id', drink.id))
          lineStates[drink.id] = { openingStock: opening, purchased: newPurchased, closingStock: expected }
        }
        await Promise.all(ops)
        setLineStates({ ...lineStates })
        setStep('inventory')
        await loadData()
        return
      }

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({ date: todayStr, label: dateLabelLong(todayStr), total_purchase: 0, total_revenue: 0, total_cost: 0, total_profit: 0, closed: false })
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
          session_id: session.id, drink_id: drink.id, drink_name: drink.name,
          opening_stock: opening, purchased, sold: 0, closing_stock: expected, revenue: 0, cost: purchased * drink.cost,
        })
        if (purchased > 0) stockUpdates.push(supabase.from('drinks').update({ stock: expected }).eq('id', drink.id))
      }

      const { error: linesError } = await supabase.from('session_lines').insert(sessionLines)
      if (linesError) throw linesError
      await Promise.all(stockUpdates)

      const closingMap: Record<string, number> = {}
      for (const drink of drinks) closingMap[drink.id] = lines[drink.id].closingStock

      setOpenSession(session)
      setLineStates(lines)
      setClosingCounts(closingMap)
      setStep('inventory')
      await loadData()
    } catch (error) {
      console.error('Error saving purchases:', error)
      Alert.alert('Erreur', "Impossible d'enregistrer les achats")
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
          supabase.from('session_lines').update({ sold, closing_stock: closing, revenue: sold * drink.price, cost: purchased * drink.cost })
            .eq('session_id', openSession.id).eq('drink_id', drink.id)
        )
        ops.push(supabase.from('drinks').update({ stock: closing }).eq('id', drink.id))
      }
      ops.push(
        supabase.from('sessions').update({ total_purchase: totalPurchaseCost, total_revenue: totalRevenue, total_cost: totalPurchaseCost, total_profit: netProfit, closed: true })
          .eq('id', openSession.id)
      )
      await Promise.all(ops)
      await loadData()
      const { data } = await supabase.from('sessions').select('*, session_lines (*)').eq('id', openSession.id).single()
      if (data) openJournal(data)
    } catch (error) {
      console.error('Error closing session:', error)
      Alert.alert('Erreur', 'Erreur lors de la clôture')
    } finally {
      setSaving(false)
    }
  }

  const reopenForEdit = async () => {
    const session = closedToday
    if (!session) return
    Alert.alert('Modifier la session', 'La session sera rouverte pour correction.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rouvrir',
        onPress: async () => {
          await supabase.from('sessions').update({ closed: false }).eq('id', session.id)
          setStep('inventory')
          await loadData()
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
      <View style={styles.container}>
        <ScreenHeader title="Session" subtitle={dateLabel(todayStr)} />
        <ScreenSkeleton variant="list" />
      </View>
    )
  }

  // ────────────────────────────── STEP: PURCHASES ──────────────────────────────
  const renderPurchasesStep = () => (
    <StepContent stepKey="purchases">
      <View style={styles.stepHintBox}>
        <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
        <Text style={styles.stepHintText}>Enregistrez les livraisons reçues aujourd'hui. Elles s'ajouteront au stock existant.</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.slate} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.slate}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.slate} />
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
        {purchasedDrinks.length > 0 && (
          <Text style={styles.groupLabel}>Livraisons saisies ({purchasedDrinks.length})</Text>
        )}
        {orderedDrinks.map(drink => {
          const rackSize = getRackSize(drink.id)
          const racksVal = toRacks(purchases[drink.id] ?? 0, drink.id)
          const unitsVal = purchases[drink.id] ?? 0
          const hasDelivery = unitsVal > 0
          return (
            <View key={drink.id} style={[styles.purchaseCard, hasDelivery && styles.purchaseCardActive]}>
              <View style={styles.purchaseCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                  <Text style={styles.drinkCat}>{drink.category}</Text>
                </View>
                <View style={styles.stockTag}>
                  <Text style={styles.stockTagLabel}>Stock actuel</Text>
                  <Text style={styles.stockTagValue}>{formatWithCassiers(drink.stock, drink.category)}</Text>
                </View>
              </View>

              <View style={styles.dividerLight} />

              <View style={styles.purchaseInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    Casiers reçus{rackSize > 1 ? ` (1 casier = ${rackSize} unités)` : ''}
                  </Text>
                  {hasDelivery && (
                    <Text style={styles.unitConversion}>
                      {racksVal} casier{racksVal > 1 ? 's' : ''} = {unitsVal} unités
                    </Text>
                  )}
                </View>
                <MiniStepper
                  value={racksVal}
                  onChange={v => setPurchases(prev => ({ ...prev, [drink.id]: toUnits(v, drink.id) }))}
                />
              </View>

              {hasDelivery && (
                <View style={styles.afterDelivery}>
                  <Ionicons name="trending-up" size={14} color={COLORS.emerald} />
                  <Text style={styles.afterDeliveryText}>
                    Nouveau stock : {formatWithCassiers(drink.stock + unitsVal, drink.category)}
                  </Text>
                </View>
              )}
            </View>
          )
        })}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={COLORS.slateLight} />
            <Text style={styles.emptyStateText}>Aucun article trouvé</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </StepContent>
  )

  // ─────────────────────────── STEP: INVENTORY ─────────────────────────────────
  const renderInventoryStep = () => (
    <StepContent stepKey="inventory">
      <View style={styles.stepHintBox}>
        <Ionicons name="clipboard-outline" size={16} color={COLORS.primary} />
        <Text style={styles.stepHintText}>Comptez le stock physique restant. Les ventes sont calculées automatiquement.</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.slate} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.slate}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.slate} />
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
          const isNegative = closing > expected

          return (
            <View key={drink.id} style={[styles.inventoryCard, hasSales && styles.inventoryCardActive]}>
              {/* Header */}
              <View style={styles.inventoryCardTop}>
                <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                <View style={[styles.catBadge, { backgroundColor: COLORS.slateLight }]}>
                  <Text style={styles.catBadgeText}>{drink.category}</Text>
                </View>
              </View>

              {/* Stock flow row */}
              <View style={styles.stockFlowRow}>
                <View style={styles.stockFlowItem}>
                  <Text style={styles.stockFlowLabel}>Début</Text>
                  <Text style={styles.stockFlowValue}>{fmtNum(opening)}</Text>
                </View>
                {purchased > 0 && (
                  <>
                    <Ionicons name="add" size={14} color={COLORS.slate} style={{ marginTop: 14 }} />
                    <View style={styles.stockFlowItem}>
                      <Text style={styles.stockFlowLabel}>Reçu</Text>
                      <Text style={[styles.stockFlowValue, { color: COLORS.primary }]}>+{fmtNum(purchased)}</Text>
                    </View>
                  </>
                )}
                <Ionicons name="arrow-forward" size={14} color={COLORS.slate} style={{ marginTop: 14 }} />
                <View style={styles.stockFlowItem}>
                  <Text style={styles.stockFlowLabel}>Disponible</Text>
                  <Text style={[styles.stockFlowValue, { color: COLORS.slateDark }]}>{fmtNum(expected)}</Text>
                </View>
              </View>

              <View style={styles.dividerLight} />

              {/* Count input */}
              <View style={styles.countInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stock compté</Text>
                  {isNegative && (
                    <Text style={styles.warningText}>⚠ Supérieur au stock disponible</Text>
                  )}
                </View>
                <MiniStepper
                  value={closing}
                  onChange={v => setClosingCounts(prev => ({ ...prev, [drink.id]: v }))}
                />
              </View>

              {/* Result row */}
              {hasSales ? (
                <View style={styles.soldResult}>
                  <View style={styles.soldResultLeft}>
                    <Text style={styles.soldResultLabel}>Vendus</Text>
                    <Text style={styles.soldResultQty}>{formatWithCassiers(sold, drink.category)}</Text>
                  </View>
                  <Text style={styles.soldResultRevenue}>{fmt(sold * drink.price)}</Text>
                </View>
              ) : (
                <View style={styles.noSalesRow}>
                  <Ionicons name="remove-circle-outline" size={14} color={COLORS.slate} />
                  <Text style={styles.noSalesText}>Aucune vente comptabilisée</Text>
                </View>
              )}
            </View>
          )
        })}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={COLORS.slateLight} />
            <Text style={styles.emptyStateText}>Aucun article trouvé</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </StepContent>
  )

  // ──────────────────────────── STEP: SUMMARY ──────────────────────────────────
  const renderSummaryStep = () => (
    <StepContent stepKey="summary">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.summaryContent} keyboardShouldPersistTaps="handled">

        {/* P&L Hero */}
        <View style={styles.plHero}>
          <Text style={styles.plHeroTitle}>Résultat du jour</Text>
          <Text style={[styles.plHeroNet, { color: netProfit >= 0 ? COLORS.emerald : COLORS.rose }]}>
            {fmt(netProfit)}
          </Text>
          <Text style={styles.plHeroLabel}>Résultat net</Text>

          <View style={styles.plHeroStats}>
            <StatPill label="Revenu" value={fmt(totalRevenue)} accent={COLORS.primary} />
            <StatPill label="Achats" value={fmt(totalPurchaseCost)} accent={COLORS.rose} />
            <StatPill label="Dépenses" value={fmt(totalExpenses)} accent={COLORS.amber} />
          </View>
        </View>

        {/* P&L breakdown */}
        <View style={styles.plCard}>
          <Text style={styles.sectionTitle}>Compte de résultat</Text>
          <PLRow label="Revenu des ventes" value={fmt(totalRevenue)} />
          <PLRow label={`Unités vendues`} value={fmtNum(totalSold)} muted />
          <PLRow label="Coût des achats" value={`-${fmt(totalPurchaseCost)}`} negative />
          <View style={styles.plDivider} />
          <PLRow label="Marge brute" value={fmt(grossProfit)} highlight accent={grossProfit >= 0 ? COLORS.primary : COLORS.rose} />
          <PLRow label="Dépenses opérationnelles" value={`-${fmt(totalExpenses)}`} negative />
          <View style={styles.plDivider} />
          <PLRow label="Résultat net" value={fmt(netProfit)} bold accent={netProfit >= 0 ? COLORS.emerald : COLORS.rose} />
        </View>

        {/* Comprehensive stock movement table */}
        {activeDrinks.length > 0 && (
          <View style={styles.tableCard}>
            <View style={styles.tableCardHeader}>
              <Text style={styles.sectionTitle}>Mouvements de stock</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeDrinks.length} articles</Text>
              </View>
            </View>

            {/* Table header */}
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 2 }]}>Article</Text>
              <Text style={[styles.th, styles.thNum]}>Début</Text>
              <Text style={[styles.th, styles.thNum]}>+Reçu</Text>
              <Text style={[styles.th, styles.thNum]}>Dispo</Text>
              <Text style={[styles.th, styles.thNum]}>Compté</Text>
              <Text style={[styles.th, styles.thNum, styles.thAccent]}>Vendus</Text>
              <Text style={[styles.th, styles.thMoney]}>Revenu</Text>
            </View>

            {activeDrinks.map((drink, i) => {
              const opening = lineStates[drink.id]?.openingStock ?? drink.stock - (purchases[drink.id] ?? 0)
              const purchased = lineStates[drink.id]?.purchased ?? purchases[drink.id] ?? 0
              const expected = opening + purchased
              const closing = closingCounts[drink.id] ?? expected
              const sold = getSold(drink.id)
              return (
                <View key={drink.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{drink.name}</Text>
                  <Text style={[styles.td, styles.tdNum]}>{fmtNum(opening)}</Text>
                  <Text style={[styles.td, styles.tdNum, purchased > 0 && styles.tdPositive]}>
                    {purchased > 0 ? `+${fmtNum(purchased)}` : '—'}
                  </Text>
                  <Text style={[styles.td, styles.tdNum]}>{fmtNum(expected)}</Text>
                  <Text style={[styles.td, styles.tdNum]}>{fmtNum(closing)}</Text>
                  <Text style={[styles.td, styles.tdNum, sold > 0 && styles.tdAccent]}>{fmtNum(sold)}</Text>
                  <Text style={[styles.td, styles.tdMoney]}>{sold > 0 ? fmt(sold * drink.price) : '—'}</Text>
                </View>
              )
            })}

            {/* Total row */}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tdTotal, { flex: 2 }]}>TOTAL</Text>
              <Text style={[styles.tdTotal, styles.tdNum]}>—</Text>
              <Text style={[styles.tdTotal, styles.tdNum, styles.tdPositive]}>
                {totalPurchasedUnits > 0 ? `+${fmtNum(totalPurchasedUnits)}` : '—'}
              </Text>
              <Text style={[styles.tdTotal, styles.tdNum]}>—</Text>
              <Text style={[styles.tdTotal, styles.tdNum]}>—</Text>
              <Text style={[styles.tdTotal, styles.tdNum, styles.tdAccent]}>{fmtNum(totalSold)}</Text>
              <Text style={[styles.tdTotal, styles.tdMoney, { color: COLORS.primary }]}>{fmt(totalRevenue)}</Text>
            </View>
          </View>
        )}

        {activeDrinks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={COLORS.slateLight} />
            <Text style={styles.emptyStateText}>Aucune vente ni achat enregistré</Text>
          </View>
        )}

        {/* Expenses */}
        <SessionExpensesPanel date={todayStr} expenses={todayExpenses} onChange={loadData} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </StepContent>
  )

  // ────────────────────────── STEP: DONE ──────────────────────────────────────
  const renderDoneStep = () => (
    <StepContent stepKey="done">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Calendar (desktop only in the main area) */}
        {isDesktop && (
          <View style={styles.calendarWrap}>
            <Calendar
              current={selectedDate}
              onDayPress={day => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                calendarBackground: COLORS.white,
                textSectionTitleColor: COLORS.slate,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.slateDark,
                textDisabledColor: COLORS.slateLight,
                arrowColor: COLORS.primary,
                monthTextColor: COLORS.slateDark,
                textMonthFontFamily: FONT.bold,
                textDayFontFamily: FONT.regular,
                textDayHeaderFontFamily: FONT.semibold,
              }}
            />
          </View>
        )}

        {/* Status card for selected date (desktop) */}
        {isDesktop && (
          <View style={styles.dateStatusCard}>
            <View style={styles.dateStatusHeader}>
              <Text style={styles.dateStatusTitle}>{dateLabelLong(selectedDate)}</Text>
              {selectedDate === todayStr && (
                <View style={styles.todayPill}>
                  <Text style={styles.todayPillText}>Aujourd'hui</Text>
                </View>
              )}
            </View>

            {selectedDateSession.closed ? (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.emeraldLight }]}>
                    <Ionicons name="checkmark" size={18} color={COLORS.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Session clôturée</Text>
                    <Text style={styles.statusSub}>
                      Revenu: {fmt(selectedDateSession.closed.total_revenue)} · Net: {fmt(selectedDateSession.closed.total_profit)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => openJournal(selectedDateSession.closed!)}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Voir le journal</Text>
                </TouchableOpacity>
              </View>
            ) : selectedDateSession.open ? (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.amberLight }]}>
                    <Ionicons name="time" size={18} color={COLORS.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Session en cours</Text>
                    <Text style={styles.statusSub}>Continuez l'inventaire</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => { setOpenSession(selectedDateSession.open); setStep('inventory') }}
                >
                  <Ionicons name="play" size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Reprendre</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusIcon, { backgroundColor: COLORS.slateLight }]}>
                    <Ionicons name="add" size={18} color={COLORS.slate} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Aucune session</Text>
                    <Text style={styles.statusSub}>Démarrer pour cette date</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => startNewSession(selectedDate)}>
                  <Ionicons name="add" size={18} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Démarrer la session</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Mobile: new session button */}
        {!isDesktop && !closedToday && !openSession && (
          <TouchableOpacity style={[styles.primaryBtn, { marginHorizontal: 16, marginTop: 16 }]} onPress={() => startNewSession(todayStr)}>
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>Démarrer la session d'aujourd'hui</Text>
          </TouchableOpacity>
        )}

        {/* Past sessions list */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>Sessions récentes</Text>
          {pastSessions.slice(0, 15).map((s, i) => (
            <TouchableOpacity key={s.id} style={[styles.historyRow, i === 0 && { borderTopWidth: 0 }]} onPress={() => openJournal(s)}>
              <View style={[styles.historyDot, { backgroundColor: s.closed ? COLORS.emeraldLight : COLORS.amberLight }]}>
                <Ionicons name={s.closed ? 'checkmark' : 'time'} size={12} color={s.closed ? COLORS.emerald : COLORS.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>{dateLabelLong(s.date)}</Text>
                <Text style={styles.historyMeta}>{fmtNum(s.session_lines?.reduce((a, l) => a + l.sold, 0) ?? 0)} unités vendues</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={styles.historyRevenue}>{fmt(s.total_revenue)}</Text>
                <Text style={[styles.historyNet, { color: s.total_profit >= 0 ? COLORS.emerald : COLORS.rose }]}>
                  {s.total_profit >= 0 ? '+' : ''}{fmt(s.total_profit)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.slateLight} />
            </TouchableOpacity>
          ))}
          {pastSessions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.slateLight} />
              <Text style={styles.emptyStateText}>Aucune session clôturée</Text>
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
      btns.push({ label: 'Passer', secondary: true, onPress: savePurchases })
      btns.push({ label: saving ? '' : 'Continuer', onPress: savePurchases, loading: saving })
    } else if (step === 'inventory') {
      btns.push({ label: '← Achats', secondary: true, onPress: () => setStep('purchases') })
      btns.push({ label: 'Voir le récap', onPress: goToSummary })
    } else if (step === 'summary') {
      btns.push({ label: '← Retour', secondary: true, onPress: () => setStep('inventory') })
      btns.push({ label: saving ? '' : 'Clôturer la journée', onPress: closeSession, loading: saving })
    }

    return (
      <View style={styles.footer}>
        {btns.map((b, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.footerBtn, b.secondary ? styles.footerBtnSecondary : styles.footerBtnPrimary, (b.loading) && { opacity: 0.7 }]}
            onPress={b.onPress}
            disabled={b.loading}
          >
            {b.loading
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={b.secondary ? styles.footerBtnSecondaryText : styles.footerBtnPrimaryText}>{b.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  // ───────────────────────── MAIN CONTENT ──────────────────────────────────────
  const content = (
    <View style={styles.container}>
      <ScreenHeader
        title="Session du jour"
        subtitle={dateLabel(todayStr)}
        right={step === 'done' && !isDesktop ? (
          <TouchableOpacity onPress={() => {
            const s = closedToday ?? openSession ?? pastSessions[0]
            if (s) openJournal(s)
          }} style={{ padding: 4 }}>
            <Ionicons name="journal-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        ) : undefined}
      />

      {step !== 'done' && (
        <ModernStepIndicator steps={STEPS} current={step} onStepPress={openSession ? handleStepPress : undefined} />
      )}

      {step === 'purchases' && renderPurchasesStep()}
      {step === 'inventory' && renderInventoryStep()}
      {step === 'summary' && renderSummaryStep()}
      {step === 'done' && renderDoneStep()}

      {renderFooter()}
    </View>
  )

  // Desktop split view (journal detail alongside)
  if (isDesktop && step === 'done') {
    return (
      <View style={styles.desktopSplit}>
        <View style={[styles.desktopLeft, !selectedSessionId && { flex: 1 }]}>
          {content}
        </View>
        {selectedSessionId && (
          <View style={styles.desktopRight}>
            <TouchableOpacity style={styles.desktopCloseBtn} onPress={() => setSelectedSessionId(null)}>
              <Ionicons name="close" size={22} color={COLORS.slate} />
            </TouchableOpacity>
            <SessionDetailScreen
              route={{ params: { sessionId: selectedSessionId } } as any}
              navigation={{ ...navigation, goBack: () => setSelectedSessionId(null) } as any}
            />
          </View>
        )}
      </View>
    )
  }

  return content
}

// ─── Helper sub-components ────────────────────────────────────────────────────
function PLRow({
  label, value, muted, negative, highlight, bold, accent,
}: {
  label: string; value: string; muted?: boolean; negative?: boolean
  highlight?: boolean; bold?: boolean; accent?: string
}) {
  return (
    <View style={[plr.row, highlight && plr.rowHighlight]}>
      <Text style={[plr.label, muted && plr.muted]}>{label}</Text>
      <Text style={[plr.value, bold && plr.bold, negative && { color: COLORS.rose }, accent ? { color: accent } : {}]}>
        {value}
      </Text>
    </View>
  )
}
const plr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowHighlight: { backgroundColor: COLORS.primaryLight + '40', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 8 },
  label: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate, flex: 1 },
  muted: { fontSize: 12, color: COLORS.slate },
  value: { fontSize: 14, fontFamily: FONT.semibold, color: COLORS.slateDark, fontVariant: ['tabular-nums'] },
  bold: { fontSize: 16, fontFamily: FONT.bold },
})

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // step hint
  stepHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepHintText: { flex: 1, fontSize: 13, fontFamily: FONT.regular, color: COLORS.primary, lineHeight: 18 },

  // search + filter
  toolbar: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: COLORS.slateDark },
  catScroll: { maxHeight: 44 },
  catScrollContent: { gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.slate },
  catChipTextActive: { color: COLORS.white },

  listContent: { paddingHorizontal: 12, paddingTop: 8 },
  groupLabel: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },

  // PURCHASE CARDS
  purchaseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  purchaseCardActive: {
    borderColor: COLORS.primary,
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(24,119,242,0.12)' } }),
  },
  purchaseCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  drinkName: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.slateDark, marginBottom: 2 },
  drinkCat: { fontSize: 11, fontFamily: FONT.medium, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.5 },
  stockTag: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.slateLight,
    minWidth: 80,
  },
  stockTagLabel: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  stockTagValue: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.slateDark },
  dividerLight: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  purchaseInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputLabel: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.slate, marginBottom: 3 },
  unitConversion: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.primary },
  afterDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  afterDeliveryText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.emerald },

  // INVENTORY CARDS
  inventoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  inventoryCardActive: {
    borderColor: COLORS.primary + '60',
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(24,119,242,0.1)' } }),
  },
  inventoryCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.5 },

  // stock flow
  stockFlowRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  stockFlowItem: { alignItems: 'center', minWidth: 48 },
  stockFlowLabel: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  stockFlowValue: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.slate, fontVariant: ['tabular-nums'] },

  countInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warningText: { fontSize: 11, fontFamily: FONT.medium, color: COLORS.amber, marginTop: 2 },

  soldResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  soldResultLeft: { flex: 1 },
  soldResultLabel: { fontSize: 11, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  soldResultQty: { fontSize: 14, fontFamily: FONT.semibold, color: COLORS.slateDark },
  soldResultRevenue: { fontSize: 16, fontFamily: FONT.bold, color: COLORS.primary, fontVariant: ['tabular-nums'] },
  noSalesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  noSalesText: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, fontStyle: 'italic' },

  // SUMMARY
  summaryContent: { padding: 12 },
  plHero: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({ web: { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' } }),
  },
  plHeroTitle: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  plHeroNet: { fontSize: 36, fontFamily: FONT.extrabold, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  plHeroLabel: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 2, marginBottom: 16 },
  plHeroStats: { flexDirection: 'row', gap: 8, width: '100%' },

  plCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.slateDark, marginBottom: 12 },
  plDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },

  // comprehensive table
  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 0 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: COLORS.primaryLight },
  countBadgeText: { fontSize: 12, fontFamily: FONT.bold, color: COLORS.primary },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  th: { fontSize: 10, fontFamily: FONT.bold, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.3 },
  thNum: { width: 42, textAlign: 'right' },
  thMoney: { width: 70, textAlign: 'right' },
  thAccent: { color: COLORS.primary },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  tableRowEven: { backgroundColor: COLORS.surface + '60' },
  td: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.slateDark },
  tdNum: { width: 42, textAlign: 'right', fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },
  tdMoney: { width: 70, textAlign: 'right', fontFamily: FONT.bold, color: COLORS.primary, fontVariant: ['tabular-nums'], fontSize: 12 },
  tdPositive: { color: COLORS.primary },
  tdAccent: { color: COLORS.primary },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight + '50',
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary + '40',
    alignItems: 'center',
  },
  tdTotal: { fontSize: 13, fontFamily: FONT.bold, color: COLORS.slateDark },

  // DONE / HISTORY
  calendarWrap: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  dateStatusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateStatusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  dateStatusTitle: { fontSize: 16, fontFamily: FONT.bold, color: COLORS.slateDark, flex: 1, marginRight: 8 },
  todayPill: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.primaryLight, borderRadius: 20 },
  todayPillText: { fontSize: 11, fontFamily: FONT.bold, color: COLORS.primary },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.slateDark },
  statusSub: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 2 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(24,119,242,0.25)', cursor: 'pointer' } }),
  },
  primaryBtnText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.white },

  historySection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historySectionTitle: { fontSize: 15, fontFamily: FONT.bold, color: COLORS.slateDark, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  historyDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyDate: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.slateDark },
  historyMeta: { fontSize: 11, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 1 },
  historyRevenue: { fontSize: 14, fontFamily: FONT.bold, color: COLORS.slateDark, fontVariant: ['tabular-nums'] },
  historyNet: { fontSize: 12, fontFamily: FONT.semibold, fontVariant: ['tabular-nums'] },

  // FOOTER
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...Platform.select({ web: { boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' } }),
  },
  footerBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footerBtnPrimary: {
    backgroundColor: COLORS.primary,
    flex: 2,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(24,119,242,0.25)' } }),
  },
  footerBtnSecondary: { backgroundColor: COLORS.slateLight },
  footerBtnPrimaryText: { fontSize: 14, fontFamily: FONT.bold, color: COLORS.white },
  footerBtnSecondaryText: { fontSize: 14, fontFamily: FONT.semibold, color: COLORS.slate },

  // desktop split
  desktopSplit: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.surface },
  desktopLeft: { width: '42%', backgroundColor: COLORS.surface, borderRightWidth: 1, borderRightColor: COLORS.border },
  desktopRight: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },

  // shared
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyStateText: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate },
})
