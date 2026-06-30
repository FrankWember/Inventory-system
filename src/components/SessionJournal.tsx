import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Session, Expense } from '../types'
import { SessionExpensesPanel } from './SessionExpensesPanel'
import { COLORS, fmt, fmtNum, dateLabelLong, formatWithCassiersShort } from '../utils/helpers'

interface SessionJournalProps {
  visible: boolean
  session: Session | null
  expenses: Expense[]
  onClose: () => void
  onEdit?: () => void
  onExpensesChange?: () => void
  drinksCategoryMap?: Record<string, string>
}

export function SessionJournal({
  visible,
  session,
  expenses,
  onClose,
  onEdit,
  onExpensesChange,
  drinksCategoryMap = {},
}: SessionJournalProps) {
  if (!session) return null

  const lines = session.session_lines ?? []
  const purchaseLines = lines.filter(l => l.purchased > 0)
  const saleLines = lines.filter(l => l.sold > 0).sort((a, b) => b.revenue - a.revenue)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalUnits = lines.reduce((s, l) => s + l.sold, 0)
  const grossProfit = session.total_revenue - session.total_cost
  const netProfit = session.total_revenue - session.total_cost - totalExpenses

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={COLORS.slateDark} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Journal de caisse</Text>
            <Text style={styles.headerDate}>{dateLabelLong(session.date)}</Text>
          </View>
          {onEdit && session.closed ? (
            <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.statusBadge, session.closed ? styles.statusClosed : styles.statusOpen]}>
            <Ionicons
              name={session.closed ? 'checkmark-circle' : 'time'}
              size={16}
              color={session.closed ? COLORS.emerald : COLORS.primary}
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
              valueColor={netProfit >= 0 ? COLORS.emerald : COLORS.rose}
            />
          </View>

          <Section title="Réception et achat" count={purchaseLines.length} color={COLORS.violet}>
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

          <SessionExpensesPanel
            date={session.date}
            expenses={expenses}
            onChange={onExpensesChange ?? (() => {})}
            readOnly={!onExpensesChange}
          />

          <Section title="Détail de vente" count={saleLines.length} color={COLORS.emerald}>
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
                        cols={[line.drink_name, formatWithCassiersShort(line.sold, cat), fmt(line.revenue)]}
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

          <Section title="Mouvement de stock" count={lines.filter(l => l.purchased > 0 || l.sold > 0).length} color={COLORS.slate600}>
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function Section({ title, count, children, color }: { title: string; count: number; children: React.ReactNode; color?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={[styles.sectionCount, color && { color, backgroundColor: color + '15' }]}>{count}</Text>
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
            positive && { color: COLORS.emerald },
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
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBtn: { padding: 4, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.slateDark },
  headerDate: { fontSize: 11, color: COLORS.slate, marginTop: 1 },
  editBtn: { width: 64, alignItems: 'flex-end' },
  editText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  body: { padding: 16, paddingBottom: 40 },
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
  statusClosed: { backgroundColor: COLORS.emeraldLight },
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
  thRight: { width: 80, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  td: { fontSize: 13, color: COLORS.slateDark, fontWeight: '500' },
  tdRight: { width: 80, textAlign: 'right', fontWeight: '700' },
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
