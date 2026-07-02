import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/authClient'
import { showAlert } from '../utils/appAlert'
import { Expense, ExpenseCategory } from '../types'
import { COLORS, fmt } from '../utils/helpers'
import { useTranslation } from '../i18n'

const CATEGORIES: ExpenseCategory[] = [
  'Approvisionnement', 'Salaires', 'Loyer', 'Électricité/Eau', 'Réparations', 'Transport', 'Autre',
]

interface SessionExpensesPanelProps {
  date: string
  expenses: Expense[]
  onChange: () => void
  readOnly?: boolean
}

/**
 * A session closed earlier snapshots net profit into sessions.total_profit.
 * When expenses for that date change afterwards, resync the snapshot so the
 * Dashboard/Trends (which read total_profit) agree with the journal (which
 * recomputes from live expenses).
 */
async function syncClosedSessionProfit(date: string): Promise<void> {
  const [sessionsRes, expensesRes] = await Promise.all([
    supabase.from('sessions').select('id, total_revenue, total_cost, closed').eq('date', date).eq('closed', true),
    supabase.from('expenses').select('amount').eq('date', date),
  ])
  if (sessionsRes.error || expensesRes.error) return
  const session = sessionsRes.data?.[0]
  if (!session) return

  const totalExpenses = (expensesRes.data ?? []).reduce((s, e) => s + (e.amount || 0), 0)
  const netProfit = (session.total_revenue || 0) - (session.total_cost || 0) - totalExpenses
  await supabase.from('sessions').update({ total_profit: netProfit }).eq('id', session.id)
}

export function SessionExpensesPanel({ date, expenses, onChange, readOnly = false }: SessionExpensesPanelProps) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Autre')
  const [saving, setSaving] = useState(false)

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const addExpense = async () => {
    const amt = parseInt(amount, 10)
    if (!description.trim() || !amt || amt <= 0) {
      showAlert(t('common.error'), t('misc.expenseRequired'))
      return
    }
    setSaving(true)
    try {
      // Get current user ID
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        date,
        description: description.trim(),
        category,
        amount: amt,
      })
      if (error) throw error
      setDescription('')
      setAmount('')
      setCategory('Autre')
      setShowForm(false)
      await syncClosedSessionProfit(date)
      onChange()
    } catch (e) {
      showAlert(t('common.error'), t('misc.expenseAddError'))
    } finally {
      setSaving(false)
    }
  }

  const deleteExpense = async (id: string) => {
    showAlert(t('common.delete'), t('misc.expenseDeleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('expenses').delete().eq('id', id)
          if (error) {
            showAlert(t('common.error'), t('misc.expenseDeleteError'))
            return
          }
          await syncClosedSessionProfit(date)
          onChange()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('misc.expensesTitle')}</Text>
        <Text style={styles.total}>{fmt(total)}</Text>
      </View>

      {expenses.map(exp => (
        <View key={exp.id} style={styles.row}>
          <View style={styles.rowIcon}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.rose} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowDesc}>{exp.description}</Text>
            <Text style={styles.rowCat}>{exp.category}</Text>
          </View>
          <Text style={styles.rowAmt}>-{fmt(exp.amount)}</Text>
          {!readOnly && (
            <TouchableOpacity onPress={() => deleteExpense(exp.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={COLORS.slate} />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {expenses.length === 0 && (
        <Text style={styles.empty}>{t('misc.expensesEmpty')}</Text>
      )}

      {!readOnly && (
        <>
          {showForm ? (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder={t('misc.expenseDescPlaceholder')}
                value={description}
                onChangeText={setDescription}
                placeholderTextColor={COLORS.slate}
              />
              <TextInput
                style={styles.input}
                placeholder={t('misc.expenseAmountPlaceholder')}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholderTextColor={COLORS.slate}
              />
              <ScrollCategories category={category} onSelect={setCategory} />
              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addExpense}
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  disabled={saving}
                >
                  <Text style={styles.saveText}>{t('misc.add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.addText}>{t('misc.addExpense')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  )
}

function ScrollCategories({
  category,
  onSelect,
}: {
  category: ExpenseCategory
  onSelect: (c: ExpenseCategory) => void
}) {
  return (
    <View style={styles.catWrap}>
      {CATEGORIES.map(c => (
        <TouchableOpacity
          key={c}
          onPress={() => onSelect(c)}
          style={[styles.catChip, category === c && styles.catChipActive]}
        >
          <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.slateDark },
  total: { fontSize: 15, fontWeight: '700', color: COLORS.rose },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.roseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowDesc: { fontSize: 14, fontWeight: '500', color: COLORS.slateDark },
  rowCat: { fontSize: 11, color: COLORS.slate, marginTop: 2 },
  rowAmt: { fontSize: 13, fontWeight: '700', color: COLORS.rose },
  empty: { fontSize: 13, color: COLORS.slate, fontStyle: 'italic', marginBottom: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  form: { marginTop: 8, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.slateDark,
    backgroundColor: COLORS.surface,
  },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 11, color: COLORS.slate, fontWeight: '600' },
  catTextActive: { color: COLORS.white },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelText: { fontSize: 14, color: COLORS.slate, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
})
