import { Session, Expense } from '../types'
import { supabase } from '../lib/supabase'

export type PeriodType = 'day' | '7days' | '30days' | 'all'

export interface PdfData {
  sessions: Session[]
  expenses: Expense[]
  startDate: string
  endDate: string
  periodType: PeriodType
}

/**
 * Get date range for a given period type
 */
export function getDateRange(periodType: PeriodType, specificDate?: string): { startDate: string; endDate: string } {
  const today = new Date()
  const endDate = formatDate(today)

  let startDate: string

  switch (periodType) {
    case 'day':
      if (!specificDate) {
        throw new Error('specificDate is required for day period')
      }
      return { startDate: specificDate, endDate: specificDate }

    case '7days':
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      startDate = formatDate(sevenDaysAgo)
      return { startDate, endDate }

    case '30days':
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      startDate = formatDate(thirtyDaysAgo)
      return { startDate, endDate }

    case 'all':
      return { startDate: '2000-01-01', endDate }

    default:
      throw new Error('Invalid period type')
  }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fetch data for PDF generation
 */
export async function fetchPdfData(periodType: PeriodType, specificDate?: string): Promise<PdfData> {
  const { startDate, endDate } = getDateRange(periodType, specificDate)

  // Fetch sessions with their lines
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, session_lines (*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (sessionsError) throw sessionsError

  // Fetch expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (expensesError) throw expensesError

  return {
    sessions: sessions || [],
    expenses: expenses || [],
    startDate,
    endDate,
    periodType,
  }
}

/**
 * Calculate summary metrics from PDF data
 */
export function calculateSummary(data: PdfData) {
  const totalRevenue = data.sessions.reduce((sum, s) => sum + s.total_revenue, 0)
  const totalCost = data.sessions.reduce((sum, s) => sum + s.total_cost, 0)
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0)
  const grossProfit = totalRevenue - totalCost
  const netProfit = grossProfit - totalExpenses

  const totalUnitsSold = data.sessions.reduce((sum, session) => {
    const sessionUnits = (session.session_lines || []).reduce((s, line) => s + line.sold, 0)
    return sum + sessionUnits
  }, 0)

  return {
    totalRevenue,
    totalCost,
    totalExpenses,
    grossProfit,
    netProfit,
    totalUnitsSold,
    sessionCount: data.sessions.length,
    grossMarginPercent: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    netMarginPercent: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  }
}
