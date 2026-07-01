// Pure PDF report calculations — no Supabase/React Native imports so they run
// under the Node test runner. pdfService.ts re-exports these for the app.
import { Session, Expense } from '../types'

export type PeriodType = 'day' | '7days' | '30days' | 'all' | 'session'

export interface PdfData {
  sessions: Session[]
  expenses: Expense[]
  startDate: string
  endDate: string
  periodType: PeriodType
  /** drink_id → category, used to group session lines by category */
  drinkCategories: Record<string, string>
}

/**
 * Format date as YYYY-MM-DD (local timezone)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get date range for a given period type
 */
export function getDateRange(periodType: PeriodType, specificDate?: string): { startDate: string; endDate: string } {
  const today = new Date()
  const endDate = formatDate(today)

  switch (periodType) {
    case 'day':
      if (!specificDate) {
        throw new Error('specificDate is required for day period')
      }
      return { startDate: specificDate, endDate: specificDate }

    case '7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return { startDate: formatDate(sevenDaysAgo), endDate }
    }

    case '30days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return { startDate: formatDate(thirtyDaysAgo), endDate }
    }

    case 'all':
      return { startDate: '2000-01-01', endDate }

    default:
      throw new Error('Invalid period type')
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

/**
 * Get top selling products from session data.
 * Uses the revenue recorded on each line at sale time.
 */
export function getTopProducts(data: PdfData, limit = 10) {
  const productMap = new Map<string, { name: string; sold: number; revenue: number }>()

  data.sessions.forEach(session => {
    (session.session_lines || []).forEach(line => {
      const existing = productMap.get(line.drink_name) || { name: line.drink_name, sold: 0, revenue: 0 }
      productMap.set(line.drink_name, {
        name: line.drink_name,
        sold: existing.sold + line.sold,
        revenue: existing.revenue + line.revenue,
      })
    })
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

/**
 * Get category breakdown (session lines don't store the category — it comes
 * from data.drinkCategories, keyed by drink_id).
 */
export function getCategoryBreakdown(data: PdfData) {
  const categoryMap = new Map<string, { name: string; sold: number; revenue: number }>()

  data.sessions.forEach(session => {
    (session.session_lines || []).forEach(line => {
      const category = data.drinkCategories[line.drink_id] || 'Autre'
      const existing = categoryMap.get(category) || { name: category, sold: 0, revenue: 0 }
      categoryMap.set(category, {
        name: category,
        sold: existing.sold + line.sold,
        revenue: existing.revenue + line.revenue,
      })
    })
  })

  return Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue)
}

/**
 * Get daily revenue trends (for charts)
 */
export function getDailyTrends(data: PdfData) {
  return data.sessions.map(session => ({
    date: session.date,
    revenue: session.total_revenue,
    profit: session.total_profit,
    cost: session.total_cost,
  })).reverse() // Oldest to newest for chart
}
