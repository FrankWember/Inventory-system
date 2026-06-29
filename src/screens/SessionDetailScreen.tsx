import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { supabase } from '../lib/supabase'
import { Session, Expense } from '../types'
import { SessionExpensesPanel } from '../components/SessionExpensesPanel'
import { COLORS, fmt, fmtNum, dateLabelLong, formatWithCassiers } from '../utils/helpers'

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>

export default function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params
  const [session, setSession] = useState<Session | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [drinksCategoryMap, setDrinksCategoryMap] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [sessionId])

  const loadData = async () => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*, session_lines (*)')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Load expenses for the session date
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('date', sessionData.date)
        .order('created_at')

      if (expensesError) throw expensesError

      // Load drinks category map
      const { data: drinksData } = await supabase
        .from('drinks')
        .select('id, category')

      const categoryMap: Record<string, string> = {}
      drinksData?.forEach(d => {
        categoryMap[d.id] = d.category
      })

      setSession(sessionData)
      setExpenses(expensesData || [])
      setDrinksCategoryMap(categoryMap)
    } catch (error) {
      console.error('Error loading session:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.slate }}>Session introuvable</Text>
      </View>
    )
  }

  const lines = session.session_lines ?? []
  const purchaseLines = lines.filter(l => l.purchased > 0)
  const saleLines = lines.filter(l => l.sold > 0).sort((a, b) => b.revenue - a.revenue)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalUnits = lines.reduce((s, l) => s + l.sold, 0)
  const grossProfit = session.total_revenue - session.total_cost
  const netProfit = session.total_revenue - session.total_cost - totalExpenses

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{dateLabelLong(session.date)}</Text>
        </View>

        <View style={[styles.statusBadge, session.closed ? styles.statusClosed : styles.statusOpen]}>
          <Ionicons
            name={session.closed ? 'checkmark-circle' : 'time'}
            size={16}
            color={session.closed ? COLORS.primary : COLORS.primary}
          />
          <Text style={styles.statusText}>
            {session.closed ? 'Journée clôturée' : 'Session en cours'}
          </Text>
        </View>

        <View style={styles.plCard}>
          <Text style={styles.plTitle}>Compte de résultat</Text>
          <JournalRow label="Revenu des ventes" value={fmt(session.total_revenue)} positive />
          <JournalRow label={`Unités vendues (${fmtNum(totalUnits)})`} value="" muted />
          <JournalRow label="Coût des achats" value={`-${fmt(session.total_cost)}`} negative />
          <JournalRow label="Marge brute" value={fmt(grossProfit)} highlight />
          <JournalRow label="Dépenses opérationnelles" value={`-${fmt(totalExpenses)}`} negative />
          <View style={styles.plDivider} />
          <JournalRow
            label="Résultat net"
            value={fmt(netProfit)}
            bold
            valueColor={netProfit >= 0 ? COLORS.primary : COLORS.rose}
          />
        </View>

        <Section title="Réceptions / Achats" count={purchaseLines.length}>
          {purchaseLines.length === 0 ? (
            <Text style={styles.sectionEmpty}>Aucun achat enregistré</Text>
          ) : (
            <View style={styles.table}>
              <TableHeader cols={['Article', 'Qté', 'Coût']} />
              {purchaseLines.map(line => (
                <TableRow key={line.id} cols={[line.drink_name, fmtNum(line.purchased), fmt(line.cost)]} />
              ))}
            </View>
          )}
        </Section>

        <Section title="Ventes" count={saleLines.length}>
          {saleLines.length === 0 ? (
            <Text style={styles.sectionEmpty}>Aucune vente</Text>
          ) : (
            <View style={styles.table}>
              <TableHeader cols={['Article', 'Vendu', 'Revenu']} />
              {saleLines.map(line => {
                const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
                return (
                  <View key={line.id}>
                    <TableRow
                      cols={[line.drink_name, formatWithCassiers(line.sold, cat), fmt(line.revenue)]}
                    />
                    <Text style={styles.lineDetail}>
                      Stock: {fmtNum(line.opening_stock)} → {fmtNum(line.closing_stock)}
                      {line.purchased > 0 ? ` · +${line.purchased} reçus` : ''}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </Section>

        <Section title="Mouvements de stock" count={lines.filter(l => l.purchased > 0 || l.sold > 0).length}>
          {lines
            .filter(l => l.purchased > 0 || l.sold > 0)
            .map(line => (
              <View key={line.id} style={styles.movementRow}>
                <Text style={styles.movementName} numberOfLines={1}>{line.drink_name}</Text>
                <Text style={styles.movementFlow}>
                  {fmtNum(line.opening_stock)}
                  {line.purchased > 0 ? ` +${line.purchased}` : ''}
                  {line.sold > 0 ? ` −${line.sold}` : ''}
                  {' = '}{fmtNum(line.closing_stock)}
                </Text>
              </View>
            ))}
        </Section>

        <SessionExpensesPanel
          date={session.date}
          expenses={expenses}
          onChange={loadData}
          readOnly={false}
        />
      </ScrollView>
    </View>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {children}
    </View>
  )
}

function JournalRow({
  label,
  value,
  positive,
  negative,
  highlight,
  bold,
  muted,
  valueColor,
}: {
  label: string
  value: string
  positive?: boolean
  negative?: boolean
  highlight?: boolean
  bold?: boolean
  muted?: boolean
  valueColor?: string
}) {
  return (
    <View style={[styles.jRow, highlight && styles.jRowHighlight]}>
      <Text style={[styles.jLabel, muted && styles.jMuted]}>{label}</Text>
      {value ? (
        <Text
          style={[
            styles.jValue,
            bold && styles.jBold,
            positive && { color: COLORS.primary },
            negative && { color: COLORS.rose },
            valueColor ? { color: valueColor } : null,
          ]}
        >
          {value}
        </Text>
      ) : null}
    </View>
  )
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <View style={styles.tableHeader}>
      {cols.map((c, i) => (
        <Text key={i} style={[styles.th, i === 0 && { flex: 1 }, i > 0 && styles.thRight]}>
          {c}
        </Text>
      ))}
    </View>
  )
}

function TableRow({ cols }: { cols: string[] }) {
  return (
    <View style={styles.tableRow}>
      {cols.map((c, i) => (
        <Text
          key={i}
          style={[styles.td, i === 0 && { flex: 1 }, i > 0 && styles.tdRight]}
          numberOfLines={i === 0 ? 2 : 1}
        >
          {c}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  body: { padding: 16, paddingBottom: 40 },
  dateHeader: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slateDark,
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusClosed: { backgroundColor: COLORS.primaryLight },
  statusOpen: { backgroundColor: COLORS.primaryLight },
  statusText: { fontSize: 13, fontWeight: '600', color: COLORS.slateDark },
  plCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  plTitle: { fontSize: 15, fontWeight: '700', color: COLORS.slateDark, marginBottom: 12 },
  jRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  jRowHighlight: {
    backgroundColor: COLORS.primaryLight + '50',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  jLabel: { fontSize: 14, color: COLORS.slate },
  jMuted: { fontSize: 12, color: COLORS.slate },
  jValue: { fontSize: 14, fontWeight: '600', color: COLORS.slateDark },
  jBold: { fontSize: 16, fontWeight: '700' },
  plDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.slateDark },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionEmpty: { fontSize: 13, color: COLORS.slate, fontStyle: 'italic' },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.slate, textTransform: 'uppercase' },
  thRight: { width: 72, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  td: { fontSize: 13, color: COLORS.slateDark, fontWeight: '500' },
  tdRight: { width: 72, textAlign: 'right', fontWeight: '700' },
  lineDetail: {
    fontSize: 11,
    color: COLORS.slate,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
  },
  movementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  movementName: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.slateDark },
  movementFlow: { fontSize: 12, color: COLORS.slate },
})
