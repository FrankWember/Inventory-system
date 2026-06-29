import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  marginPct,
  markupPct,
  stockStatus,
  sessionTotals,
  PricedLine,
} from '../utils/calculations'

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard & Analytics Integration Tests
// Testing dashboard metrics, KPIs, and analytics features
// ═══════════════════════════════════════════════════════════════════════════

// Mock data structures
interface DashboardMetrics {
  totalRevenue: number
  totalProfit: number
  totalSales: number
  marginPercentage: number
  lowStockCount: number
  topPerformers: Array<{ name: string; revenue: number }>
}

interface CategoryPerformance {
  category: string
  revenue: number
  units: number
  profit: number
}

// ─── User Story 1: View Revenue Metrics ────────────────────────────────────
test('User Story: User can view total revenue on dashboard', async () => {
  // Given: Multiple completed sessions
  const sessions = [
    { lines: [{ opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }], expenses: 0 }, // Rev: 10,000
    { lines: [{ opening: 24, purchased: 0, closing: 12, price: 550, cost: 350 }], expenses: 0 }, // Rev: 6,600
    { lines: [{ opening: 48, purchased: 0, closing: 24, price: 350, cost: 150 }], expenses: 0 }, // Rev: 8,400
  ]

  // When: Dashboard calculates total revenue
  let totalRevenue = 0
  for (const session of sessions) {
    const totals = sessionTotals(session.lines as PricedLine[], session.expenses)
    totalRevenue += totals.revenue
  }

  // Then: Revenue is summed correctly across all sessions
  assert.equal(totalRevenue, 25000, 'Total revenue should be 250.00 EUR')
})

test('User Story: Revenue metrics show detailed breakdown', async () => {
  // Given: A session with multiple product lines
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // 20 sold @ 5.00 = 10,000
    { opening: 24, purchased: 0, closing: 12, price: 550, cost: 350 }, // 12 sold @ 5.50 = 6,600
    { opening: 48, purchased: 0, closing: 24, price: 350, cost: 150 }, // 24 sold @ 3.50 = 8,400
  ]

  // When: Totals are calculated
  const totals = sessionTotals(lines)

  // Then: Revenue is broken down correctly
  assert.equal(totals.revenue, 25000, 'Total revenue should be 25,000')
  assert.equal(totals.units, 56, 'Total units sold should be 56')

  // Average price per unit
  const avgPrice = totals.revenue / totals.units
  assert.ok(avgPrice > 400 && avgPrice < 500, 'Average price should be reasonable')
})

// ─── User Story 2: View Profit Metrics ─────────────────────────────────────
test('User Story: User can view gross and net profit', async () => {
  // Given: A session with sales and expenses
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // 20 sold, revenue 10,000
  ]
  const expenses = 1000

  // When: Profit is calculated
  const totals = sessionTotals(lines, expenses)

  // Then: Both gross and net profit are shown
  // Gross profit = revenue - purchase cost (no purchases, so = revenue)
  assert.equal(totals.grossProfit, 10000, 'Gross profit should be 10,000')
  assert.equal(totals.netProfit, 9000, 'Net profit should be 9,000 (gross - expenses)')
  assert.ok(totals.netProfit < totals.grossProfit, 'Net should be less than gross')
})

test('User Story: Profit margin percentage is calculated', async () => {
  // Given: Various revenue and profit scenarios
  const testCases = [
    { revenue: 10000, profit: 2500, expectedMargin: 25 },
    { revenue: 5000, profit: 1000, expectedMargin: 20 },
    { revenue: 20000, profit: 10000, expectedMargin: 50 },
  ]

  // When: Margin percentage is calculated
  for (const tc of testCases) {
    const margin = marginPct(tc.revenue, tc.profit)

    // Then: Margin is correct percentage
    assert.equal(margin, tc.expectedMargin,
      `Margin for ${tc.profit}/${tc.revenue} should be ${tc.expectedMargin}%`)
  }
})

test('User Story: Margin handles edge cases', async () => {
  // Scenario 1: Zero revenue
  const zeroRevenue = marginPct(0, 0)
  assert.equal(zeroRevenue, 0, 'Zero revenue should give 0% margin')

  // Scenario 2: Negative profit (loss)
  const negativeProfitMargin = marginPct(10000, -2000)
  assert.equal(negativeProfitMargin, -20, 'Negative profit should give negative margin')

  // Scenario 3: 100% margin (no cost)
  const fullMargin = marginPct(5000, 5000)
  assert.equal(fullMargin, 100, '100% margin should be possible')
})

// ─── User Story 3: View Markup Percentage ──────────────────────────────────
test('User Story: User can see markup on products', async () => {
  // Given: Products with different markups
  const testCases = [
    { price: 500, cost: 300, expectedMarkup: 66.666 }, // ~67% markup
    { price: 1000, cost: 500, expectedMarkup: 100 },    // 100% markup (double)
    { price: 600, cost: 400, expectedMarkup: 50 },      // 50% markup
  ]

  // When: Markup is calculated
  for (const tc of testCases) {
    const markup = markupPct(tc.price, tc.cost)

    // Then: Markup percentage is correct
    assert.ok(Math.abs(markup - tc.expectedMarkup) < 0.01,
      `Markup for ${tc.price}/${tc.cost} should be ~${tc.expectedMarkup}%`)
  }
})

test('User Story: Markup handles zero cost', async () => {
  // Given: Zero cost (e.g., promotional items)
  const markup = markupPct(500, 0)

  // When: Markup is calculated
  // Then: Returns 0 to avoid division by zero
  assert.equal(markup, 0, 'Zero cost should give 0% markup')
})

// ─── User Story 4: View Stock Status Overview ──────────────────────────────
test('User Story: Dashboard shows stock status overview', async () => {
  // Given: Multiple items with different stock levels
  interface StockItem {
    name: string
    stock: number
    minStock: number
  }

  const inventory: StockItem[] = [
    { name: 'Heineken', stock: 0, minStock: 12 },      // Rupture
    { name: 'Corona', stock: 6, minStock: 12 },        // Low
    { name: 'Coca-Cola', stock: 15, minStock: 12 },    // Medium
    { name: 'Pepsi', stock: 25, minStock: 12 },        // OK
  ]

  // When: Stock statuses are calculated
  const statusCounts = {
    rupture: 0,
    low: 0,
    medium: 0,
    ok: 0,
  }

  for (const item of inventory) {
    const status = stockStatus(item.stock, item.minStock)
    statusCounts[status]++
  }

  // Then: Dashboard shows correct distribution
  assert.equal(statusCounts.rupture, 1, 'Should have 1 item out of stock')
  assert.equal(statusCounts.low, 1, 'Should have 1 item low')
  assert.equal(statusCounts.medium, 1, 'Should have 1 item medium')
  assert.equal(statusCounts.ok, 1, 'Should have 1 item ok')
})

test('User Story: User can see count of low stock items', async () => {
  // Given: Inventory with various stock levels
  const inventory = [
    { stock: 0, minStock: 12, status: 'rupture' },
    { stock: 6, minStock: 12, status: 'low' },
    { stock: 10, minStock: 12, status: 'low' },
    { stock: 25, minStock: 12, status: 'ok' },
  ]

  // When: Counting items needing attention
  const needsAttention = inventory.filter(item =>
    item.stock <= item.minStock
  ).length

  // Then: Dashboard shows accurate count
  assert.equal(needsAttention, 3, 'Should identify 3 items needing attention')
})

// ─── User Story 5: View Category Performance ───────────────────────────────
test('User Story: User can see performance by category', async () => {
  // Given: Sales data grouped by category
  interface CategorySale {
    category: string
    sold: number
    price: number
    cost: number
  }

  const sales: CategorySale[] = [
    { category: 'Bière', sold: 50, price: 500, cost: 300 },
    { category: 'Bière', sold: 30, price: 550, cost: 350 },
    { category: 'Soft', sold: 40, price: 350, cost: 150 },
    { category: 'Spiritueux', sold: 10, price: 800, cost: 500 },
  ]

  // When: Category performance is aggregated
  const categoryMap = new Map<string, CategoryPerformance>()

  for (const sale of sales) {
    const existing = categoryMap.get(sale.category) || {
      category: sale.category,
      revenue: 0,
      units: 0,
      profit: 0,
    }

    existing.revenue += sale.sold * sale.price
    existing.units += sale.sold
    existing.profit += sale.sold * (sale.price - sale.cost)

    categoryMap.set(sale.category, existing)
  }

  // Then: Each category shows aggregated metrics
  const biere = categoryMap.get('Bière')!
  assert.equal(biere.revenue, (50 * 500) + (30 * 550), 'Bière revenue should be sum of both beers')
  assert.equal(biere.units, 80, 'Bière units should be 80')

  const soft = categoryMap.get('Soft')!
  assert.equal(soft.revenue, 40 * 350, 'Soft revenue should be correct')
  assert.equal(soft.units, 40, 'Soft units should be 40')
})

test('User Story: Categories are ranked by revenue', async () => {
  // Given: Multiple categories with different revenues
  const categories: CategoryPerformance[] = [
    { category: 'Bière', revenue: 25000, units: 50, profit: 10000 },
    { category: 'Soft', revenue: 14000, units: 40, profit: 8000 },
    { category: 'Spiritueux', revenue: 8000, units: 10, profit: 3000 },
  ]

  // When: Categories are sorted by revenue
  const ranked = [...categories].sort((a, b) => b.revenue - a.revenue)

  // Then: Top category is shown first
  assert.equal(ranked[0].category, 'Bière', 'Bière should be top category')
  assert.equal(ranked[1].category, 'Soft', 'Soft should be second')
  assert.equal(ranked[2].category, 'Spiritueux', 'Spiritueux should be third')
})

// ─── User Story 6: View Top Performers ─────────────────────────────────────
test('User Story: User can see top selling products', async () => {
  // Given: Sales data for all products
  interface ProductSale {
    name: string
    unitsSold: number
    revenue: number
  }

  const products: ProductSale[] = [
    { name: 'Heineken', unitsSold: 50, revenue: 25000 },
    { name: 'Corona', unitsSold: 30, revenue: 16500 },
    { name: 'Coca-Cola', unitsSold: 40, revenue: 14000 },
    { name: 'Whisky', unitsSold: 10, revenue: 8000 },
    { name: 'Red Bull', unitsSold: 25, revenue: 10000 },
  ]

  // When: Top 3 by revenue are selected
  const topByRevenue = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3)

  // Then: Top performers are identified
  assert.equal(topByRevenue[0].name, 'Heineken', 'Heineken should be #1 by revenue')
  assert.equal(topByRevenue[1].name, 'Corona', 'Corona should be #2 by revenue')
  assert.equal(topByRevenue[2].name, 'Coca-Cola', 'Coca-Cola should be #3 by revenue')
})

test('User Story: Top performers can be ranked by units sold', async () => {
  // Given: Product sales data
  interface ProductSale {
    name: string
    unitsSold: number
  }

  const products: ProductSale[] = [
    { name: 'Heineken', unitsSold: 50 },
    { name: 'Corona', unitsSold: 30 },
    { name: 'Coca-Cola', unitsSold: 60 }, // Highest volume
    { name: 'Whisky', unitsSold: 10 },
  ]

  // When: Ranked by volume
  const topByVolume = [...products]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 3)

  // Then: Volume leaders are shown
  assert.equal(topByVolume[0].name, 'Coca-Cola', 'Coca-Cola should lead in volume')
  assert.equal(topByVolume[1].name, 'Heineken', 'Heineken should be second')
  assert.equal(topByVolume[2].name, 'Corona', 'Corona should be third')
})

// ─── User Story 7: View Daily Performance ──────────────────────────────────
test('User Story: Dashboard shows today\'s performance', async () => {
  // Given: Today's session data
  const todayLines: PricedLine[] = [
    { opening: 50, purchased: 24, closing: 30, price: 500, cost: 300 },
    { opening: 24, purchased: 0, closing: 10, price: 550, cost: 350 },
  ]
  const todayExpenses = 2000

  // When: Today's metrics are calculated
  const today = sessionTotals(todayLines, todayExpenses)

  // Then: Today's KPIs are shown
  assert.ok(today.revenue > 0, 'Today should have revenue')
  assert.ok(today.netProfit !== undefined, 'Today should have net profit')
  assert.ok(today.units > 0, 'Today should have units sold')
})

test('User Story: Dashboard compares today vs yesterday', async () => {
  // Given: Data for today and yesterday
  const yesterday: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 },
  ]
  const today: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 20, price: 500, cost: 300 },
  ]

  // When: Both days are calculated
  const yesterdayTotals = sessionTotals(yesterday)
  const todayTotals = sessionTotals(today)

  // Then: Comparison shows improvement or decline
  const revenueChange = todayTotals.revenue - yesterdayTotals.revenue
  const percentChange = (revenueChange / yesterdayTotals.revenue) * 100

  assert.equal(yesterdayTotals.units, 20, 'Yesterday sold 20 units')
  assert.equal(todayTotals.units, 30, 'Today sold 30 units')
  assert.ok(percentChange > 0, 'Today should show positive growth')
  assert.equal(percentChange, 50, 'Today is 50% better than yesterday')
})

// ─── User Story 8: View Financial Summary ──────────────────────────────────
test('User Story: Dashboard shows period financial summary', async () => {
  // Given: Multiple days of data
  const sessions = [
    { lines: [{ opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }] as PricedLine[], expenses: 1000 },
    { lines: [{ opening: 40, purchased: 0, closing: 20, price: 500, cost: 300 }] as PricedLine[], expenses: 1500 },
    { lines: [{ opening: 60, purchased: 0, closing: 30, price: 500, cost: 300 }] as PricedLine[], expenses: 2000 },
  ]

  // When: Period totals are aggregated
  let periodRevenue = 0
  let periodProfit = 0
  let periodExpenses = 0

  for (const session of sessions) {
    const totals = sessionTotals(session.lines, session.expenses)
    periodRevenue += totals.revenue
    periodProfit += totals.netProfit
    periodExpenses += session.expenses
  }

  // Then: Period summary is accurate
  // Session 1: 20 sold * 500 = 10,000
  // Session 2: 20 sold * 500 = 10,000
  // Session 3: 30 sold * 500 = 15,000
  // Total: 35,000
  assert.equal(periodRevenue, 35000, 'Period revenue should sum all sessions')
  assert.equal(periodExpenses, 4500, 'Period expenses should sum all days')
  assert.ok(periodProfit > 0, 'Period should be profitable')
})

// ─── User Story 9: View Stock Alerts ───────────────────────────────────────
test('User Story: Dashboard highlights urgent stock alerts', async () => {
  // Given: Inventory with critical items
  interface AlertItem {
    name: string
    stock: number
    minStock: number
    priority: 'critical' | 'warning' | 'ok'
  }

  const inventory = [
    { name: 'Heineken', stock: 0, minStock: 12 },   // Critical
    { name: 'Corona', stock: 5, minStock: 12 },     // Warning
    { name: 'Coca-Cola', stock: 25, minStock: 12 }, // OK
  ]

  // When: Alerts are prioritized
  const alerts: AlertItem[] = inventory.map(item => ({
    ...item,
    priority: item.stock === 0 ? 'critical' :
              item.stock <= item.minStock ? 'warning' : 'ok',
  }))

  const criticalAlerts = alerts.filter(a => a.priority === 'critical')
  const warningAlerts = alerts.filter(a => a.priority === 'warning')

  // Then: Critical alerts are shown prominently
  assert.equal(criticalAlerts.length, 1, 'Should have 1 critical alert')
  assert.equal(warningAlerts.length, 1, 'Should have 1 warning alert')
  assert.equal(criticalAlerts[0].name, 'Heineken', 'Heineken should be critical')
})

// ─── User Story 10: Complete Dashboard View ────────────────────────────────
test('User Story: Complete dashboard provides comprehensive overview', async () => {
  // Given: A complete set of business data
  const todaySession: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 },
    { opening: 24, purchased: 0, closing: 10, price: 550, cost: 350 },
    { opening: 48, purchased: 0, closing: 24, price: 350, cost: 150 },
  ]
  const expenses = 2000

  const inventory = [
    { name: 'Product A', stock: 0, minStock: 12 },
    { name: 'Product B', stock: 5, minStock: 12 },
    { name: 'Product C', stock: 30, minStock: 12 },
  ]

  // When: Dashboard metrics are compiled
  const metrics: DashboardMetrics = {
    totalRevenue: 0,
    totalProfit: 0,
    totalSales: 0,
    marginPercentage: 0,
    lowStockCount: 0,
    topPerformers: [],
  }

  // Calculate today's totals
  const totals = sessionTotals(todaySession, expenses)
  metrics.totalRevenue = totals.revenue
  metrics.totalProfit = totals.netProfit
  metrics.totalSales = totals.units
  metrics.marginPercentage = marginPct(totals.revenue, totals.grossProfit)

  // Count low stock items
  metrics.lowStockCount = inventory.filter(item => item.stock <= item.minStock).length

  // Then: All key metrics are available
  assert.ok(metrics.totalRevenue > 0, 'Dashboard should show revenue')
  assert.ok(metrics.totalProfit !== undefined, 'Dashboard should show profit')
  assert.ok(metrics.totalSales > 0, 'Dashboard should show sales volume')
  assert.ok(metrics.marginPercentage >= 0, 'Dashboard should show margin')
  assert.equal(metrics.lowStockCount, 2, 'Dashboard should show 2 low stock items')
})

test('User Story: Dashboard loads with no data gracefully', async () => {
  // Given: A new account with no sessions yet
  const noSessions: PricedLine[] = []

  // When: Dashboard attempts to load
  const totals = sessionTotals(noSessions)

  // Then: Dashboard shows zeros without errors
  assert.equal(totals.revenue, 0, 'Revenue should be 0')
  assert.equal(totals.grossProfit, 0, 'Profit should be 0')
  assert.equal(totals.units, 0, 'Sales should be 0')

  const margin = marginPct(totals.revenue, totals.grossProfit)
  assert.equal(margin, 0, 'Margin should handle zero values')
})

test('User Story: Dashboard updates in real-time as session progresses', async () => {
  // Given: A session in progress
  let currentLines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 50, price: 500, cost: 300 }, // No sales yet
  ]

  // When: Initial dashboard load
  let totals = sessionTotals(currentLines)
  assert.equal(totals.revenue, 0, 'Initial revenue should be 0')

  // When: Sales occur (closing stock decreases)
  currentLines[0].closing = 40
  totals = sessionTotals(currentLines)

  // Then: Dashboard reflects new sales
  assert.equal(totals.revenue, 5000, 'Revenue should update to 5,000')
  assert.equal(totals.units, 10, 'Units should update to 10')

  // When: More sales occur
  currentLines[0].closing = 30
  totals = sessionTotals(currentLines)

  // Then: Dashboard continues to update
  assert.equal(totals.revenue, 10000, 'Revenue should update to 10,000')
  assert.equal(totals.units, 20, 'Units should update to 20')
})
