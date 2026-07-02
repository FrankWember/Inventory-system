import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PdfData,
  calculateSummary,
  getTopProducts,
  getCategoryBreakdown,
  getDailyTrends,
  getDateRange,
  formatDate,
} from './pdfCalculations'
import { Session, SessionLine, Expense } from '../types'

// ─── Builders ────────────────────────────────────────────────────────────────

let idSeq = 0
const nextId = () => `id-${++idSeq}`

function line(partial: Partial<SessionLine>): SessionLine {
  return {
    id: nextId(),
    user_id: 'test-user-id',
    session_id: 's1',
    drink_id: 'd1',
    drink_name: 'Castel',
    opening_stock: 0,
    purchased: 0,
    sold: 0,
    closing_stock: 0,
    revenue: 0,
    cost: 0,
    ...partial,
  }
}

function session(partial: Partial<Session>): Session {
  return {
    id: nextId(),
    user_id: 'test-user-id',
    date: '2026-06-30',
    label: 'Session',
    total_purchase: 0,
    total_revenue: 0,
    total_cost: 0,
    total_profit: 0,
    closed: true,
    created_at: '2026-06-30T00:00:00Z',
    session_lines: [],
    ...partial,
  }
}

function expense(amount: number, date = '2026-06-30'): Expense {
  return {
    id: nextId(),
    user_id: 'test-user-id',
    date,
    description: 'Test',
    category: 'Autre',
    amount,
    created_at: `${date}T00:00:00Z`,
  }
}

function pdfData(partial: Partial<PdfData>): PdfData {
  return {
    sessions: [],
    expenses: [],
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    periodType: '30days',
    drinkCategories: {},
    ...partial,
  }
}

// ─── calculateSummary ────────────────────────────────────────────────────────

test('calculateSummary: totals across sessions and expenses', () => {
  const data = pdfData({
    sessions: [
      session({ total_revenue: 10000, total_cost: 4000, session_lines: [line({ sold: 10 }), line({ sold: 5 })] }),
      session({ total_revenue: 20000, total_cost: 6000, session_lines: [line({ sold: 20 })] }),
    ],
    expenses: [expense(3000), expense(2000)],
  })

  const s = calculateSummary(data)
  assert.equal(s.totalRevenue, 30000)
  assert.equal(s.totalCost, 10000)
  assert.equal(s.totalExpenses, 5000)
  assert.equal(s.grossProfit, 20000)
  assert.equal(s.netProfit, 15000)
  assert.equal(s.totalUnitsSold, 35)
  assert.equal(s.sessionCount, 2)
  assert.ok(Math.abs(s.grossMarginPercent - (20000 / 30000) * 100) < 1e-9)
  assert.ok(Math.abs(s.netMarginPercent - 50) < 1e-9)
})

test('calculateSummary: empty data gives zeros, no NaN', () => {
  const s = calculateSummary(pdfData({}))
  assert.equal(s.totalRevenue, 0)
  assert.equal(s.grossMarginPercent, 0)
  assert.equal(s.netMarginPercent, 0)
  assert.equal(s.totalUnitsSold, 0)
})

test('calculateSummary: net loss when expenses exceed gross profit', () => {
  const s = calculateSummary(pdfData({
    sessions: [session({ total_revenue: 5000, total_cost: 4000 })],
    expenses: [expense(2000)],
  }))
  assert.equal(s.grossProfit, 1000)
  assert.equal(s.netProfit, -1000)
})

// ─── getTopProducts ──────────────────────────────────────────────────────────

test('getTopProducts: aggregates recorded line revenue across sessions', () => {
  const data = pdfData({
    sessions: [
      session({ session_lines: [
        line({ drink_name: 'Castel', sold: 10, revenue: 6000 }),
        line({ drink_name: 'Fanta', sold: 4, revenue: 2000 }),
      ] }),
      session({ session_lines: [
        // Same drink at a different (historical) price: revenue is what was
        // recorded at sale time, not sold × current price.
        line({ drink_name: 'Castel', sold: 5, revenue: 3500 }),
      ] }),
    ],
  })

  const top = getTopProducts(data)
  assert.equal(top[0].name, 'Castel')
  assert.equal(top[0].sold, 15)
  assert.equal(top[0].revenue, 9500)
  assert.equal(top[1].name, 'Fanta')
  assert.equal(top[1].revenue, 2000)
})

test('getTopProducts: respects the limit and sorts by revenue desc', () => {
  const lines = Array.from({ length: 15 }, (_, i) =>
    line({ drink_name: `Drink${i}`, sold: 1, revenue: (i + 1) * 100 })
  )
  const top = getTopProducts(pdfData({ sessions: [session({ session_lines: lines })] }), 10)
  assert.equal(top.length, 10)
  assert.equal(top[0].revenue, 1500)
  assert.ok(top.every((p, i) => i === 0 || top[i - 1].revenue >= p.revenue))
})

// ─── getCategoryBreakdown ────────────────────────────────────────────────────

test('getCategoryBreakdown: groups by drink category with fallback Autre', () => {
  const data = pdfData({
    drinkCategories: { beer1: 'Bière', soda1: 'Soda' },
    sessions: [
      session({ session_lines: [
        line({ drink_id: 'beer1', sold: 10, revenue: 6000 }),
        line({ drink_id: 'soda1', sold: 4, revenue: 2000 }),
        line({ drink_id: 'unknown', sold: 2, revenue: 1000 }),
      ] }),
    ],
  })

  const cats = getCategoryBreakdown(data)
  assert.deepEqual(
    cats.map(c => [c.name, c.sold, c.revenue]),
    [['Bière', 10, 6000], ['Soda', 4, 2000], ['Autre', 2, 1000]]
  )
})

// ─── getDailyTrends ──────────────────────────────────────────────────────────

test('getDailyTrends: reverses to oldest-first for charting', () => {
  const data = pdfData({
    sessions: [
      session({ date: '2026-06-30', total_revenue: 200 }),
      session({ date: '2026-06-29', total_revenue: 100 }),
    ],
  })
  const trends = getDailyTrends(data)
  assert.equal(trends[0].date, '2026-06-29')
  assert.equal(trends[1].date, '2026-06-30')
})

// ─── getDateRange ────────────────────────────────────────────────────────────

test('getDateRange: day requires a specific date and pins both ends to it', () => {
  assert.throws(() => getDateRange('day'), /specificDate/)
  const r = getDateRange('day', '2026-06-15')
  assert.deepEqual(r, { startDate: '2026-06-15', endDate: '2026-06-15' })
})

test('getDateRange: 7days spans a week ending today', () => {
  const { startDate, endDate } = getDateRange('7days')
  assert.equal(endDate, formatDate(new Date()))
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
  assert.equal(diffDays, 7)
})

test('getDateRange: all starts at 2000-01-01', () => {
  assert.equal(getDateRange('all').startDate, '2000-01-01')
})

test('getDateRange: invalid period throws', () => {
  assert.throws(() => getDateRange('bogus' as any))
})
