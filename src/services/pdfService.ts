import { supabase } from '../lib/supabase'
import { PdfData, PeriodType, getDateRange } from './pdfCalculations'

// Pure calculation/formatting logic lives in pdfCalculations.ts (unit-tested,
// no Supabase import). This module only does the data fetching.
export {
  PdfData,
  PeriodType,
  getDateRange,
  calculateSummary,
  getTopProducts,
  getCategoryBreakdown,
  getDailyTrends,
} from './pdfCalculations'

/**
 * Fetch drink_id → category map (session lines don't store the category)
 */
async function fetchDrinkCategories(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('drinks')
    .select('id, category')

  if (error) throw error

  const map: Record<string, string> = {}
  for (const d of data || []) {
    map[d.id] = d.category
  }
  return map
}

/**
 * Fetch data for PDF generation
 */
export async function fetchPdfData(periodType: PeriodType, specificDate?: string): Promise<PdfData> {
  // Handle session-specific export
  if (periodType === 'session' && specificDate) {
    // specificDate is actually the session ID
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, session_lines (*)')
      .eq('id', specificDate)
      .single()

    if (sessionError) throw sessionError
    if (!session) throw new Error('Session not found')

    // Fetch expenses for the same date, and drink categories for grouping
    const [expensesResult, drinkCategories] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('date', session.date)
        .order('date', { ascending: false }),
      fetchDrinkCategories(),
    ])

    if (expensesResult.error) throw expensesResult.error

    return {
      sessions: [session],
      expenses: expensesResult.data || [],
      startDate: session.date,
      endDate: session.date,
      periodType,
      drinkCategories,
    }
  }

  // Handle date-range based exports
  const { startDate, endDate } = getDateRange(periodType, specificDate)

  // Fetch sessions, expenses and drink categories in parallel
  const [sessionsResult, expensesResult, drinkCategories] = await Promise.all([
    supabase
      .from('sessions')
      .select('*, session_lines (*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false }),
    fetchDrinkCategories(),
  ])

  if (sessionsResult.error) throw sessionsResult.error
  if (expensesResult.error) throw expensesResult.error

  return {
    sessions: sessionsResult.data || [],
    expenses: expensesResult.data || [],
    startDate,
    endDate,
    periodType,
    drinkCategories,
  }
}
