import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { supabase } from '../lib/supabase'
import { Drink, Category, Session, Expense } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { StepIndicator } from '../components/StepIndicator'
import { Stepper } from '../components/Stepper'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { ScreenSkeleton } from '../components/Skeleton'
import { FadeIn } from '../components/FadeIn'
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

// Configure French locale for calendar
LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui"
}
LocaleConfig.defaultLocale = 'fr'

type Step = 'purchases' | 'inventory' | 'summary' | 'done'

const STEPS = [
  { key: 'purchases', label: 'Achats' },
  { key: 'inventory', label: 'Inventaire' },
  { key: 'summary', label: 'Récap' },
]

const BREAKPOINT = 768
const BREAKPOINT_LARGE = 1280
const BREAKPOINT_XL = 1600
const GRID_GAP = 8
const GRID_PADDING = 12

interface LineState {
  openingStock: number
  purchased: number
  closingStock: number
}

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
  const isLargeScreen = Platform.OS === 'web' && windowWidth >= BREAKPOINT_LARGE
  const isXLScreen = Platform.OS === 'web' && windowWidth >= BREAKPOINT_XL
  const numColumns = isDesktop ? 2 : 1

  // Calculate responsive flex values for split view
  const getLeftPanelFlex = () => {
    if (!selectedSessionId) return 1
    if (isXLScreen) return 0.4 // More space for detail on XL screens
    if (isLargeScreen) return 0.45
    return 0.5
  }

  const getRightPanelFlex = () => {
    if (isXLScreen) return 0.6
    if (isLargeScreen) return 0.55
    return 0.5
  }

  const drinksCategoryMap = useMemo(
    () => Object.fromEntries(drinks.map(d => [d.id, d.category])),
    [drinks]
  )

  // Generate marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: any = {}
    allSessions.forEach(session => {
      marks[session.date] = {
        marked: true,
        dotColor: session.closed ? COLORS.emerald : COLORS.amber,
      }
    })
    // Highlight selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: COLORS.primary,
      }
    }
    return marks
  }, [allSessions, selectedDate])

  // Sessions for selected date
  const sessionsForDate = useMemo(() =>
    allSessions.filter(s => s.date === selectedDate),
    [allSessions, selectedDate]
  )

  // Helper to get drink's rack size (defaults to 1 if not set)
  const getRackSize = (drinkId: string): number => {
    const drink = drinks.find(d => d.id === drinkId)
    return drink?.rack_size || 1
  }

  // Helper functions for unit conversion using drink's rack_size
  const convertToUnits = (racks: number, drinkId: string): number => {
    const rackSize = getRackSize(drinkId)
    return racks * rackSize
  }

  const convertFromUnits = (units: number, drinkId: string): number => {
    const rackSize = getRackSize(drinkId)
    return Math.floor(units / rackSize)
  }

  const loadExpensesForDate = async (date: string) => {
    const { data } = await supabase.from('expenses').select('*').eq('date', date).order('created_at')
    return data ?? []
  }

  const loadDataForDate = async (date: string) => {
    try {
      const expenses = await loadExpensesForDate(date)
      setTodayExpenses(expenses)

      const { data: dateSessions, error: sessError } = await supabase
        .from('sessions')
        .select('*, session_lines (*)')
        .eq('date', date)
        .order('created_at', { ascending: false })
      if (sessError) throw sessError

      const closed = dateSessions?.find(s => s.closed) ?? null
      const open = dateSessions?.find(s => !s.closed) ?? null

      if (date === todayStr) {
        setClosedToday(closed)
        setOpenSession(open)
      }

      return { closed, open }
    } catch (error) {
      console.error('Error loading session for date:', error)
      return { closed: null, open: null }
    }
  }

  const loadData = useCallback(async () => {
    try {
      const { data: drinksData, error: drinksError } = await supabase
        .from('drinks')
        .select('*')
        .eq('active', true)
        .order('name')
      if (drinksError) throw drinksError
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
          lines[line.drink_id] = {
            openingStock: line.opening_stock,
            purchased: line.purchased,
            closingStock: line.closing_stock,
          }
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
        .from('sessions')
        .select('*, session_lines (*)')
        .eq('closed', true)
        .order('date', { ascending: false })
        .limit(30)
      setPastSessions(history || [])

      // Load all sessions for calendar marking
      const { data: allSessionsData } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
        .limit(365)
      setAllSessions(allSessionsData || [])
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

  // Load session data when selected date changes
  useEffect(() => {
    const loadSelectedDateSession = async () => {
      const result = await loadDataForDate(selectedDate)
      setSelectedDateSession(result)
    }
    if (selectedDate && step === 'done') {
      loadSelectedDateSession()
    }
  }, [selectedDate, step])

  const getExpectedStock = (drinkId: string) => {
    const line = lineStates[drinkId]
    if (line) return line.openingStock + line.purchased
    const drink = drinks.find(d => d.id === drinkId)
    const purchased = purchases[drinkId] ?? 0
    return (drink?.stock ?? 0) + purchased
  }

  const getSold = (drinkId: string) => {
    const expected = getExpectedStock(drinkId)
    const closing = closingCounts[drinkId] ?? expected
    return Math.max(0, expected - closing)
  }

  const totalRevenue = drinks.reduce((sum, d) => sum + getSold(d.id) * d.price, 0)
  const totalPurchaseCost = drinks.reduce((sum, d) => {
    const purchased = lineStates[d.id]?.purchased ?? purchases[d.id] ?? 0
    return sum + purchased * d.cost
  }, 0)
  const totalExpenses = todayExpenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalRevenue - totalPurchaseCost
  const netProfit = grossProfit - totalExpenses

  const openJournal = async (session: Session) => {
    if (isDesktop) {
      setSelectedSessionId(session.id)
    } else {
      navigation.navigate('SessionDetail', { sessionId: session.id })
    }
  }

  const startNewSession = async (date: string) => {
    setSelectedDate(date)
    setStep('purchases')
    setPurchases({})
    setClosingCounts({})
    setLineStates({})
    // If starting for a different date, we should load that date's data
    if (date !== todayStr) {
      await loadDataForDate(date)
    }
  }

  const savePurchases = async () => {
    setSaving(true)
    try {
      if (openSession) {
        // Build all writes first, then run them concurrently (was N sequential round-trips).
        const ops: any[] = []
        for (const drink of drinks) {
          const newPurchased = purchases[drink.id] ?? 0
          const oldLine = lineStates[drink.id]
          const oldPurchased = oldLine?.purchased ?? 0
          const opening = oldLine?.openingStock ?? drink.stock - oldPurchased
          const delta = newPurchased - oldPurchased
          const expected = opening + newPurchased

          ops.push(
            supabase
              .from('session_lines')
              .update({
                purchased: newPurchased,
                closing_stock: expected,
                cost: newPurchased * drink.cost,
              })
              .eq('session_id', openSession.id)
              .eq('drink_id', drink.id)
          )

          if (delta !== 0) {
            ops.push(supabase.from('drinks').update({ stock: drink.stock + delta }).eq('id', drink.id))
          }

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
        .insert({
          date: todayStr,
          label: dateLabelLong(todayStr),
          total_purchase: 0,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0,
          closed: false,
        })
        .select()
        .single()
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
          session_id: session.id,
          drink_id: drink.id,
          drink_name: drink.name,
          opening_stock: opening,
          purchased,
          sold: 0,
          closing_stock: expected,
          revenue: 0,
          cost: purchased * drink.cost,
        })

        if (purchased > 0) {
          stockUpdates.push(supabase.from('drinks').update({ stock: expected }).eq('id', drink.id))
        }
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
      Alert.alert('Erreur', 'Impossible d\'enregistrer les achats')
    } finally {
      setSaving(false)
    }
  }

  const goToSummary = () => {
    const defaults: Record<string, number> = { ...closingCounts }
    for (const drink of drinks) {
      if (defaults[drink.id] === undefined) defaults[drink.id] = drink.stock
    }
    setClosingCounts(defaults)
    setStep('summary')
  }

  const closeSession = async () => {
    if (!openSession) return
    setSaving(true)
    try {
      // Collect every per-line and per-drink write, then fire them concurrently.
      const ops: any[] = []

      for (const drink of drinks) {
        const line = lineStates[drink.id]
        const opening = line?.openingStock ?? drink.stock
        const purchased = line?.purchased ?? purchases[drink.id] ?? 0
        const closing = closingCounts[drink.id] ?? drink.stock
        const sold = Math.max(0, opening + purchased - closing)

        ops.push(
          supabase
            .from('session_lines')
            .update({
              sold,
              closing_stock: closing,
              revenue: sold * drink.price,
              cost: purchased * drink.cost,
            })
            .eq('session_id', openSession.id)
            .eq('drink_id', drink.id)
        )

        ops.push(supabase.from('drinks').update({ stock: closing }).eq('id', drink.id))
      }

      ops.push(
        supabase
          .from('sessions')
          .update({
            total_purchase: totalPurchaseCost,
            total_revenue: totalRevenue,
            total_cost: totalPurchaseCost,
            total_profit: netProfit,
            closed: true,
          })
          .eq('id', openSession.id)
      )

      await Promise.all(ops)

      Alert.alert('Succès', 'Journée clôturée avec succès')
      await loadData()
      const { data } = await supabase
        .from('sessions')
        .select('*, session_lines (*)')
        .eq('id', openSession.id)
        .single()
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
    Alert.alert(
      'Modifier la session',
      'La session sera rouverte pour correction. Vous pourrez modifier l\'inventaire et les dépenses.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rouvrir',
          onPress: async () => {
            await supabase.from('sessions').update({ closed: false }).eq('id', session.id)
            setStep('inventory')
            await loadData()
          },
        },
      ]
    )
  }

  const handleStepPress = (key: string) => {
    if (!openSession) return
    if (key === 'purchases' || key === 'inventory' || key === 'summary') {
      if (key === 'summary') goToSummary()
      else setStep(key as Step)
    }
  }

  const filtered = drinks.filter(d => {
    if (!d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'Tout' && d.category !== categoryFilter) return false
    return true
  })

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Session" subtitle={dateLabel(todayStr)} />
        <ScreenSkeleton variant="list" />
      </View>
    )
  }

  const renderFooter = () => {
    if (step === 'done') return null
    if (step === 'purchases') {
      return (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerSkip} onPress={() => savePurchases()} disabled={saving}>
            <Text style={styles.footerSkipText}>Passer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerPrimary, saving && styles.footerDisabled]} onPress={() => savePurchases()} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.footerPrimaryText}>Continuer</Text>}
          </TouchableOpacity>
        </View>
      )
    }
    if (step === 'inventory') {
      return (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerSkip} onPress={() => setStep('purchases')}>
            <Text style={styles.footerSkipText}>Achats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerPrimary, { flex: 1 }]} onPress={goToSummary}>
            <Text style={styles.footerPrimaryText}>Récapitulatif</Text>
          </TouchableOpacity>
        </View>
      )
    }
    if (step === 'summary') {
      return (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerSkip} onPress={() => setStep('inventory')}>
            <Text style={styles.footerSkipText}>Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerPrimary, saving && styles.footerDisabled]} onPress={closeSession} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.footerPrimaryText}>Clôturer</Text>}
          </TouchableOpacity>
        </View>
      )
    }
    return null
  }

  const saleLines = filtered.filter(d => getSold(d.id) > 0)

  // Desktop split view content
  const sessionListContent = (
    <View style={styles.container}>
      {(!isDesktop || step !== 'done' || !selectedSessionId) && (
        <ScreenHeader
          title="Session"
          subtitle={dateLabel(selectedDate)}
          right={!isDesktop && (
            <TouchableOpacity
              onPress={() => {
                const s = closedToday ?? openSession ?? pastSessions[0]
                if (s) openJournal(s)
              }}
              style={styles.historyBtn}
            >
              <Ionicons name="journal-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Calendar for date selection */}
      {step === 'done' && (
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: COLORS.white,
              calendarBackground: COLORS.white,
              textSectionTitleColor: COLORS.slate,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: COLORS.white,
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.slateDark,
              textDisabledColor: COLORS.slateLight,
              dotColor: COLORS.primary,
              selectedDotColor: COLORS.white,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.slateDark,
              textMonthFontFamily: FONT.bold,
              textDayFontFamily: FONT.regular,
              textDayHeaderFontFamily: FONT.semibold,
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>
      )}

      {step !== 'done' && (
        <StepIndicator steps={STEPS} current={step} onStepPress={openSession ? handleStepPress : undefined} />
      )}

      {step === 'purchases' && (
        <Text style={styles.stepHint}>Enregistrez les livraisons reçues. Elles seront ajoutées au stock.</Text>
      )}
      {step === 'inventory' && (
        <View style={styles.inventoryHint}>
          <Text style={styles.stepHint}>Comptez le stock restant en fin de journée. Les ventes seront calculées automatiquement.</Text>
          <View style={styles.stockLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.slate }]} />
              <Text style={styles.legendText}>Stock initial</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Vendus</Text>
            </View>
          </View>
        </View>
      )}
      {step === 'summary' && (
        <Text style={styles.stepHint}>Vérifiez le récapitulatif et ajoutez les dépenses du jour.</Text>
      )}

      {step !== 'done' && (
        <>
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={COLORS.slate} />
              <TextInput style={styles.searchInput} placeholder="Rechercher..." value={search} onChangeText={setSearch} placeholderTextColor={COLORS.slate} />
            </View>
          </View>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
              {categories.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.categoryTab, categoryFilter === cat && styles.categoryTabActive]}>
                  <Text style={[styles.categoryTabText, categoryFilter === cat && styles.categoryTabTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
        {step === 'done' && isDesktop && (
          <>
            {/* Session Status Card for Selected Date */}
            <View style={styles.sessionStatusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusCardDate}>{dateLabelLong(selectedDate)}</Text>
                {selectedDate === todayStr && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                  </View>
                )}
              </View>

              {selectedDateSession.closed ? (
                // Closed session
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.emerald} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Session clôturée</Text>
                      <Text style={styles.statusSubtitle}>
                        Revenu: {fmt(selectedDateSession.closed.total_revenue)} •
                        Net: {fmt(selectedDateSession.closed.total_profit)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => openJournal(selectedDateSession.closed!)}
                  >
                    <Ionicons name="document-text" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Voir le journal</Text>
                  </TouchableOpacity>
                </View>
              ) : selectedDateSession.open ? (
                // Open session in progress
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="time" size={24} color={COLORS.amber} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Session en cours</Text>
                      <Text style={styles.statusSubtitle}>Continuer où vous en étiez</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      setOpenSession(selectedDateSession.open)
                      setSelectedDate(selectedDate)
                      setStep('inventory')
                    }}
                  >
                    <Ionicons name="play" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Reprendre</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // No session - show start button
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.slate} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Aucune session</Text>
                      <Text style={styles.statusSubtitle}>Démarrer une nouvelle session pour cette date</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => startNewSession(selectedDate)}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Démarrer la session</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Recent Sessions List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sessions récentes</Text>
              {pastSessions.slice(0, 10).map(s => (
                <TouchableOpacity key={s.id} style={styles.historyRow} onPress={() => openJournal(s)}>
                  <Text style={styles.historyDate}>{dateLabel(s.date)}</Text>
                  <Text style={styles.historyRevenue}>{fmt(s.total_revenue)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 'done' && !isDesktop && (
          <>
            {/* Session Status Card for Selected Date */}
            <View style={styles.sessionStatusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusCardDate}>{dateLabelLong(selectedDate)}</Text>
                {selectedDate === todayStr && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                  </View>
                )}
              </View>

              {selectedDateSession.closed ? (
                // Closed session
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.emerald} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Session clôturée</Text>
                      <Text style={styles.statusSubtitle}>
                        Revenu: {fmt(selectedDateSession.closed.total_revenue)} •
                        Net: {fmt(selectedDateSession.closed.total_profit)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => openJournal(selectedDateSession.closed!)}
                  >
                    <Ionicons name="document-text" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Voir le journal</Text>
                  </TouchableOpacity>
                </View>
              ) : selectedDateSession.open ? (
                // Open session in progress
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="time" size={24} color={COLORS.amber} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Session en cours</Text>
                      <Text style={styles.statusSubtitle}>Continuer où vous en étiez</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      setOpenSession(selectedDateSession.open)
                      setSelectedDate(selectedDate)
                      setStep('inventory')
                    }}
                  >
                    <Ionicons name="play" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Reprendre</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // No session - show start button
                <View style={styles.statusCardContent}>
                  <View style={styles.statusRow}>
                    <Ionicons name="add-circle-outline" size={24} color={COLORS.slate} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTitle}>Aucune session</Text>
                      <Text style={styles.statusSubtitle}>Démarrer une nouvelle session pour cette date</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => startNewSession(selectedDate)}
                  >
                    <Ionicons name="add" size={20} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Démarrer la session</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Recent Sessions List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sessions récentes</Text>
              {pastSessions.slice(0, 10).map(s => (
                <TouchableOpacity key={s.id} style={styles.historyRow} onPress={() => openJournal(s)}>
                  <Text style={styles.historyDate}>{dateLabel(s.date)}</Text>
                  <Text style={styles.historyRevenue}>{fmt(s.total_revenue)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 'purchases' && filtered.map(drink => {
          const rackSize = getRackSize(drink.id)
          const displayValue = convertFromUnits(purchases[drink.id] ?? 0, drink.id)
          const currentStock = drink.stock
          return (
            <View key={drink.id} style={styles.cardCompact}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{drink.name}</Text>
                  <Text style={styles.cardCategory}>{drink.category}</Text>
                </View>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockBadgeLabel}>Stock initial</Text>
                  <Text style={styles.stockBadgeValue}>{formatWithCassiers(currentStock, drink.category)}</Text>
                </View>
              </View>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseInfoText}>
                  {rackSize} unités/casier
                </Text>
              </View>
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Casiers reçus</Text>
                <View style={styles.stepperWrapper}>
                  <Stepper
                    value={displayValue}
                    onValueChange={v => setPurchases(prev => ({ ...prev, [drink.id]: convertToUnits(v, drink.id) }))}
                    compact
                  />
                </View>
              </View>
              {displayValue > 0 && (
                <View style={styles.purchaseSummary}>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.emerald} />
                  <Text style={styles.purchaseSummaryText}>
                    Stock après livraison: {formatWithCassiers(currentStock + convertToUnits(displayValue, drink.id), drink.category)}
                  </Text>
                </View>
              )}
            </View>
          )
        })}

        {step === 'inventory' && (
          <FlatList
            data={filtered}
            keyExtractor={d => d.id}
            numColumns={numColumns}
            key={`inventory-${numColumns}`}
            scrollEnabled={false}
            columnWrapperStyle={numColumns > 1 ? { gap: GRID_GAP } : undefined}
            contentContainerStyle={{ gap: 6 }}
            renderItem={({ item: drink }) => {
              const opening = lineStates[drink.id]?.openingStock ?? drink.stock - (purchases[drink.id] ?? 0)
              const purchased = lineStates[drink.id]?.purchased ?? purchases[drink.id] ?? 0
              const expected = opening + purchased
              const sold = getSold(drink.id)
              const closing = closingCounts[drink.id] ?? expected
              return (
                <View style={[
                  isDesktop ? styles.cardDesktop : styles.cardUltraCompact,
                  sold > 0 && styles.cardHighlight,
                  numColumns > 1 && { flex: 1 }
                ]}>
                  <View style={styles.inlineRow}>
                    <View style={styles.drinkInfo}>
                      <Text style={isDesktop ? styles.drinkNameDesktop : styles.drinkNameCompact} numberOfLines={1}>{drink.name}</Text>
                      <Text style={isDesktop ? styles.drinkMetaDesktop : styles.drinkMetaCompact}>
                        Début: {formatWithCassiers(opening, drink.category)}
                        {purchased > 0 && <Text> • Reçu: {formatWithCassiers(purchased, drink.category)}</Text>}
                        {sold > 0 && <Text style={styles.soldCompact}> • Vendus: {formatWithCassiers(sold, drink.category)}</Text>}
                      </Text>
                    </View>
                    <View style={styles.stepperInline}>
                      <Stepper
                        value={closing}
                        onValueChange={v => setClosingCounts(prev => ({ ...prev, [drink.id]: v }))}
                        compact
                      />
                    </View>
                    {sold > 0 && <Text style={isDesktop ? styles.revenueDesktop : styles.revenueInline}>{fmt(sold * drink.price)}</Text>}
                  </View>
                </View>
              )
            }}
          />
        )}

        {step === 'summary' && (
          <>
            <View style={styles.plSummary}>
              <View style={styles.plRow}><Text style={styles.plLabel}>Revenu ventes</Text><Text style={styles.plValue}>{fmt(totalRevenue)}</Text></View>
              <View style={styles.plRow}><Text style={styles.plLabel}>Coût achats</Text><Text style={[styles.plValue, { color: COLORS.rose }]}>-{fmt(totalPurchaseCost)}</Text></View>
              <View style={styles.plRow}><Text style={styles.plLabel}>Marge brute</Text><Text style={styles.plValue}>{fmt(grossProfit)}</Text></View>
              <View style={styles.plRow}><Text style={styles.plLabel}>Dépenses</Text><Text style={[styles.plValue, { color: COLORS.rose }]}>-{fmt(totalExpenses)}</Text></View>
              <View style={styles.plDivider} />
              <View style={styles.plRow}>
                <Text style={styles.plNetLabel}>Résultat net</Text>
                <Text style={[styles.plNetValue, { color: netProfit >= 0 ? COLORS.emerald : COLORS.rose }]}>{fmt(netProfit)}</Text>
              </View>
            </View>

            <SessionExpensesPanel date={todayStr} expenses={todayExpenses} onChange={loadData} />

            <Text style={styles.sectionTitle}>Journal des ventes</Text>
            <View style={styles.ledger}>
              <View style={styles.ledgerHeader}>
                <Text style={[styles.lh, { flex: 1 }]}>Article</Text>
                <Text style={styles.lh}>Qté</Text>
                <Text style={[styles.lh, styles.lhRight]}>Montant</Text>
              </View>
              {saleLines.length === 0 ? (
                <Text style={styles.emptyText}>Aucune vente</Text>
              ) : (
                saleLines.map(drink => {
                  const sold = getSold(drink.id)
                  return (
                    <View key={drink.id} style={styles.ledgerRow}>
                      <Text style={[styles.ld, { flex: 1 }]} numberOfLines={2}>{drink.name}</Text>
                      <Text style={styles.ld}>{fmtNum(sold)}</Text>
                      <Text style={[styles.ld, styles.ldRight]}>{fmt(sold * drink.price)}</Text>
                    </View>
                  )
                })
              )}
              {saleLines.length > 0 && (
                <View style={styles.ledgerTotal}>
                  <Text style={styles.ledgerTotalLabel}>Total ventes</Text>
                  <Text style={styles.ledgerTotalValue}>{fmt(totalRevenue)}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {renderFooter()}

    </View>
  )

  // Desktop split view
  if (isDesktop && step === 'done') {
    // Get the selected session to show its date
    const selectedSession = allSessions.find(s => s.id === selectedSessionId)

    return (
      <FadeIn style={styles.desktopMainContainer}>
        {selectedSessionId && selectedSession && (
          <ScreenHeader
            title="Session"
            subtitle={dateLabelLong(selectedSession.date)}
            left={
              <TouchableOpacity onPress={() => setSelectedSessionId(null)} style={styles.closeJournalBtn}>
                <Ionicons name="close" size={24} color={COLORS.slateDark} />
              </TouchableOpacity>
            }
          />
        )}
        <View style={styles.desktopContainer}>
          <View style={[styles.desktopLeft, { flex: getLeftPanelFlex() }]}>
            {sessionListContent}
          </View>
          {selectedSessionId && (
            <FadeIn style={[styles.desktopRight, { flex: getRightPanelFlex() }]} duration={300}>
              <SessionDetailScreen
                route={{ params: { sessionId: selectedSessionId, isEmbedded: true } } as any}
                navigation={{
                  ...navigation,
                  goBack: () => setSelectedSessionId(null)
                } as any}
              />
            </FadeIn>
          )}
        </View>
      </FadeIn>
    )
  }

  return sessionListContent
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  historyBtn: { padding: 4 },
  stepHint: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: COLORS.primaryLight, lineHeight: 16 },
  inventoryHint: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stockLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
  },
  toolbar: { paddingHorizontal: 12, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: COLORS.slateDark },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  categoryScroll: { flex: 1, maxHeight: 44 },
  categoryScrollContent: { gap: 6, paddingBottom: 4 },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTabText: { fontSize: 12, fontWeight: '600', color: COLORS.slate },
  categoryTabTextActive: { color: COLORS.white },
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.slateLight,
    borderRadius: 10,
    padding: 3,
  },
  unitToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unitToggleBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  unitToggleBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.slate },
  unitToggleBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 12 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompact: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardName: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.slateDark, marginBottom: 2 },
  cardCategory: { fontSize: 11, fontFamily: FONT.medium, color: COLORS.slate, textTransform: 'uppercase', letterSpacing: 0.5 },
  stockBadge: {
    alignItems: 'flex-end',
  },
  stockBadgeLabel: {
    fontSize: 10,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stockBadgeValue: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    fontVariant: ['tabular-nums'],
  },
  purchaseInfo: {
    backgroundColor: COLORS.slateLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  purchaseInfoText: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: COLORS.slate,
  },
  purchaseSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  purchaseSummaryText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.emerald,
  },
  cardUltraCompact: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardDesktop: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHighlight: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drinkInfo: {
    flex: 1,
    minWidth: 0,
  },
  drinkNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 2,
  },
  drinkNameDesktop: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 3,
  },
  drinkMetaCompact: {
    fontSize: 11,
    color: COLORS.slate,
    fontWeight: '500',
  },
  drinkMetaDesktop: {
    fontSize: 13,
    color: COLORS.slate,
    fontWeight: '500',
  },
  soldCompact: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  unitToggleMini: {
    flexDirection: 'row',
    backgroundColor: COLORS.slateLight,
    borderRadius: 6,
    padding: 2,
    marginRight: 4,
  },
  unitToggleBtnMini: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stepperInline: {
    flexShrink: 0,
  },
  revenueInline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 60,
    textAlign: 'right',
  },
  revenueDesktop: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  cardTop: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperLabel: { fontSize: 12, fontWeight: '500', color: COLORS.slate, minWidth: 100 },
  stepperWrapper: { flex: 1 },
  soldInline: { color: COLORS.primary, fontWeight: '600' },
  revenueText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 4, textAlign: 'right' },
  unitHintText: { fontSize: 11, color: COLORS.sky, fontStyle: 'italic' },
  conversionText: { fontSize: 11, color: COLORS.sky, fontStyle: 'italic', marginTop: 4 },
  soldPreview: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
  plSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  plRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  plLabel: { fontSize: 14, color: COLORS.slate },
  plValue: { fontSize: 14, fontWeight: '600', color: COLORS.slateDark },
  plDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  plNetLabel: { fontSize: 15, fontWeight: '700', color: COLORS.slateDark },
  plNetValue: { fontSize: 16, fontWeight: '700' },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.slateDark, marginBottom: 10, marginTop: 4 },
  ledger: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ledgerHeader: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lh: { fontSize: 11, fontWeight: '700', color: COLORS.slate, width: 48, textTransform: 'uppercase' },
  lhRight: { textAlign: 'right', width: 90 },
  ledgerRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  ld: { fontSize: 13, color: COLORS.slateDark, width: 48 },
  ldRight: { textAlign: 'right', width: 90, fontWeight: '700', color: COLORS.primary },
  ledgerTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: COLORS.primaryLight + '60' },
  ledgerTotalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.slateDark },
  ledgerTotalValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  historyDate: { flex: 1, fontSize: 14, color: COLORS.slateDark },
  historyRevenue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  emptyText: { fontSize: 14, color: COLORS.slate, textAlign: 'center', paddingVertical: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerSkip: { paddingVertical: 10, paddingHorizontal: 14 },
  footerSkipText: { fontSize: 14, fontFamily: FONT.semibold, color: COLORS.slate },
  footerPrimary: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footerPrimaryText: { fontSize: 14, fontFamily: FONT.bold, color: COLORS.white },
  footerDisabled: { opacity: 0.6 },
  // Desktop split view styles
  desktopMainContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  closeJournalBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  desktopLeft: {
    backgroundColor: COLORS.surface,
    minWidth: 0,
    overflow: 'hidden',
    transition: Platform.OS === 'web' ? 'flex 0.3s ease' : undefined,
  },
  desktopRight: {
    backgroundColor: COLORS.white,
    marginTop: 16,
    marginRight: 20,
    marginBottom: 20,
    marginLeft: 16,
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 0,
    transition: Platform.OS === 'web' ? 'flex 0.3s ease' : undefined,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
      },
    }),
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxHeight: 400,
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
      },
      default: {
        aspectRatio: 1.2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  sessionStatusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusCardDate: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    letterSpacing: -0.3,
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  todayBadgeText: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  statusCardContent: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: COLORS.white,
  },
})
