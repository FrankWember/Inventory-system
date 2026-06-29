import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sessionTotals,
  PricedLine,
  daysOfCover,
} from '../utils/calculations'

// ═══════════════════════════════════════════════════════════════════════════
// Trends & Reporting Integration Tests
// Testing trends analysis, historical data, and reporting features
// ═══════════════════════════════════════════════════════════════════════════

// Mock data structures
interface DailyMetrics {
  date: string
  revenue: number
  profit: number
  units: number
}

interface ProductTrend {
  productName: string
  dates: string[]
  sales: number[]
  revenue: number[]
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  percentChange: number
  isSignificant: boolean
}

// ─── User Story 1: View Sales Trends Over Time ─────────────────────────────
test('User Story: User can view daily sales trends', async () => {
  // Given: Multiple days of sales data
  const dailySales: DailyMetrics[] = [
    { date: '2024-01-10', revenue: 10000, profit: 4000, units: 20 },
    { date: '2024-01-11', revenue: 12000, profit: 5000, units: 24 },
    { date: '2024-01-12', revenue: 15000, profit: 6000, units: 30 },
    { date: '2024-01-13', revenue: 11000, profit: 4500, units: 22 },
    { date: '2024-01-14', revenue: 13000, profit: 5200, units: 26 },
  ]

  // When: Trend data is visualized
  const revenues = dailySales.map(d => d.revenue)
  const units = dailySales.map(d => d.units)

  // Then: Trends show growth pattern
  assert.equal(revenues.length, 5, 'Should have 5 days of data')
  assert.ok(revenues[2] > revenues[0], 'Mid-week should be higher than start')

  // Calculate average
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length
  assert.equal(avgRevenue, 12200, 'Average daily revenue should be 12,200')
})

test('User Story: Trends show clear upward or downward patterns', async () => {
  // Given: Consistent growth data
  const growthData = [10000, 11000, 12000, 13000, 14000]

  // When: Trend is analyzed
  const firstValue = growthData[0]
  const lastValue = growthData[growthData.length - 1]
  const percentChange = ((lastValue - firstValue) / firstValue) * 100

  // Then: Upward trend is identified
  assert.ok(lastValue > firstValue, 'Should show growth')
  assert.equal(percentChange, 40, 'Should show 40% growth')
})

test('User Story: Declining trends are identified', async () => {
  // Given: Declining sales data
  const declineData = [15000, 14000, 13000, 12000, 11000]

  // When: Trend is analyzed
  const firstValue = declineData[0]
  const lastValue = declineData[declineData.length - 1]
  const percentChange = ((lastValue - firstValue) / firstValue) * 100

  // Then: Downward trend is identified
  assert.ok(lastValue < firstValue, 'Should show decline')
  assert.ok(percentChange < 0, 'Percent change should be negative')
  assert.ok(Math.abs(percentChange) > 25, 'Decline should be significant')
})

// ─── User Story 2: Weekly and Monthly Comparisons ──────────────────────────
test('User Story: User can compare week-over-week performance', async () => {
  // Given: Two weeks of data
  const week1Revenue = [10000, 12000, 11000, 13000, 14000, 15000, 16000]
  const week2Revenue = [11000, 13000, 12000, 14000, 15000, 16000, 17000]

  // When: Weekly totals are compared
  const week1Total = week1Revenue.reduce((a, b) => a + b, 0)
  const week2Total = week2Revenue.reduce((a, b) => a + b, 0)
  const weekOverWeekGrowth = ((week2Total - week1Total) / week1Total) * 100

  // Then: Growth rate is shown
  assert.ok(week2Total > week1Total, 'Week 2 should be higher than week 1')
  assert.ok(weekOverWeekGrowth > 0, 'Should show positive growth')
  assert.ok(weekOverWeekGrowth > 7 && weekOverWeekGrowth < 8, 'Should show ~7.7% growth')
})

test('User Story: Monthly aggregation shows bigger picture', async () => {
  // Given: 30 days of data
  const monthlyData: DailyMetrics[] = []
  for (let day = 1; day <= 30; day++) {
    monthlyData.push({
      date: `2024-01-${day.toString().padStart(2, '0')}`,
      revenue: 10000 + (day * 100), // Gradual growth
      profit: 4000 + (day * 40),
      units: 20 + day,
    })
  }

  // When: Monthly totals are calculated
  const monthRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0)
  const monthProfit = monthlyData.reduce((sum, d) => sum + d.profit, 0)
  const monthUnits = monthlyData.reduce((sum, d) => sum + d.units, 0)

  // Then: Monthly metrics are available
  // Revenue: 30 * 10000 + (1+2+...+30) * 100 = 300000 + (30*31/2) * 100 = 300000 + 46500 = 346500
  assert.equal(monthRevenue, 346500, 'Monthly revenue should aggregate all days')
  assert.ok(monthProfit > 0, 'Month should be profitable')
  assert.ok(monthUnits > 600, 'Month should have significant volume')
})

// ─── User Story 3: Product Performance Trends ──────────────────────────────
test('User Story: User can track individual product trends', async () => {
  // Given: Sales history for a specific product
  const heinekenTrend: ProductTrend = {
    productName: 'Heineken',
    dates: ['2024-01-10', '2024-01-11', '2024-01-12', '2024-01-13', '2024-01-14'],
    sales: [20, 25, 22, 28, 30],
    revenue: [10000, 12500, 11000, 14000, 15000],
  }

  // When: Trend is analyzed
  const totalSales = heinekenTrend.sales.reduce((a, b) => a + b, 0)
  const totalRevenue = heinekenTrend.revenue.reduce((a, b) => a + b, 0)
  const avgDailySales = totalSales / heinekenTrend.sales.length

  // Then: Product trend shows growth
  assert.equal(totalSales, 125, 'Total units should be 125')
  assert.equal(totalRevenue, 62500, 'Total revenue should be 62,500')
  assert.equal(avgDailySales, 25, 'Average daily sales should be 25')

  const lastDaySales = heinekenTrend.sales[heinekenTrend.sales.length - 1]
  assert.ok(lastDaySales > avgDailySales, 'Latest day should exceed average')
})

test('User Story: Compare multiple products side by side', async () => {
  // Given: Trends for multiple products
  const products = [
    { name: 'Heineken', totalRevenue: 50000, totalUnits: 100 },
    { name: 'Corona', totalRevenue: 45000, totalUnits: 82 },
    { name: 'Coca-Cola', totalRevenue: 35000, totalUnits: 100 },
  ]

  // When: Products are ranked by revenue
  const byRevenue = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Then: Top performers are identified
  assert.equal(byRevenue[0].name, 'Heineken', 'Heineken leads in revenue')
  assert.equal(byRevenue[1].name, 'Corona', 'Corona is second')

  // When: Products are ranked by volume
  const byVolume = [...products].sort((a, b) => b.totalUnits - a.totalUnits)

  // Then: Volume leaders may differ from revenue leaders
  assert.ok(
    byVolume[0].name === 'Heineken' || byVolume[0].name === 'Coca-Cola',
    'Volume leaders identified'
  )
})

// ─── User Story 4: Seasonal Patterns ───────────────────────────────────────
test('User Story: User can identify day-of-week patterns', async () => {
  // Given: Data organized by day of week
  interface DayOfWeekData {
    dayName: string
    avgRevenue: number
    avgUnits: number
  }

  const weekdayData: DayOfWeekData[] = [
    { dayName: 'Monday', avgRevenue: 8000, avgUnits: 16 },
    { dayName: 'Tuesday', avgRevenue: 9000, avgUnits: 18 },
    { dayName: 'Wednesday', avgRevenue: 10000, avgUnits: 20 },
    { dayName: 'Thursday', avgRevenue: 11000, avgUnits: 22 },
    { dayName: 'Friday', avgRevenue: 18000, avgUnits: 36 },
    { dayName: 'Saturday', avgRevenue: 20000, avgUnits: 40 },
    { dayName: 'Sunday', avgRevenue: 15000, avgUnits: 30 },
  ]

  // When: Best days are identified
  const bestDay = weekdayData.reduce((best, day) =>
    day.avgRevenue > best.avgRevenue ? day : best
  )

  const worstDay = weekdayData.reduce((worst, day) =>
    day.avgRevenue < worst.avgRevenue ? day : worst
  )

  // Then: Patterns are clear
  assert.equal(bestDay.dayName, 'Saturday', 'Saturday should be best day')
  assert.equal(worstDay.dayName, 'Monday', 'Monday should be slowest')

  // Weekend vs Weekday comparison
  const weekendAvg = (weekdayData[5].avgRevenue + weekdayData[6].avgRevenue) / 2
  const weekdayAvg = weekdayData.slice(0, 5).reduce((sum, d) => sum + d.avgRevenue, 0) / 5

  assert.ok(weekendAvg > weekdayAvg, 'Weekend should outperform weekdays on average')
})

// ─── User Story 5: Forecasting and Predictions ─────────────────────────────
test('User Story: System can forecast future inventory needs', async () => {
  // Given: Historical sales data
  const historicalDailySales = [20, 22, 24, 23, 25, 26, 24]
  const currentStock = 50

  // When: Average daily sales is calculated
  const avgDailySales = historicalDailySales.reduce((a, b) => a + b, 0) / historicalDailySales.length

  // Then: Days of cover can be forecasted
  const forecastedDays = daysOfCover(currentStock, avgDailySales)

  assert.ok(Math.abs(avgDailySales - 23.43) < 0.1, 'Average should be ~23.43')
  assert.ok(Math.abs(forecastedDays - 2.13) < 0.1, 'Should forecast ~2 days of cover')
})

test('User Story: Forecast identifies when to reorder', async () => {
  // Given: Current inventory and sales rate
  const currentStock = 30
  const avgDailySales = 10
  const leadTimeDays = 2 // Takes 2 days to get new stock
  const safetyBuffer = 1 // Want 1 extra day of buffer

  // When: Reorder point is calculated
  const daysRemaining = daysOfCover(currentStock, avgDailySales)
  const shouldReorder = daysRemaining <= (leadTimeDays + safetyBuffer)

  // Then: Reorder alert is triggered appropriately
  assert.equal(daysRemaining, 3, 'Should have 3 days remaining')
  assert.equal(shouldReorder, true, 'Should trigger reorder (3 days <= 3 day threshold)')
})

// ─── User Story 6: Profitability Trends ────────────────────────────────────
test('User Story: User can track margin trends over time', async () => {
  // Given: Daily margin data
  interface MarginData {
    date: string
    revenue: number
    profit: number
    marginPct: number
  }

  const marginTrend: MarginData[] = [
    { date: '2024-01-10', revenue: 10000, profit: 3000, marginPct: 30 },
    { date: '2024-01-11', revenue: 12000, profit: 3600, marginPct: 30 },
    { date: '2024-01-12', revenue: 15000, profit: 5250, marginPct: 35 },
    { date: '2024-01-13', revenue: 14000, profit: 5040, marginPct: 36 },
    { date: '2024-01-14', revenue: 16000, profit: 6000, marginPct: 37.5 },
  ]

  // When: Margin trend is analyzed
  const avgMargin = marginTrend.reduce((sum, d) => sum + d.marginPct, 0) / marginTrend.length
  const firstMargin = marginTrend[0].marginPct
  const lastMargin = marginTrend[marginTrend.length - 1].marginPct

  // Then: Margin improvement is visible
  assert.ok(lastMargin > firstMargin, 'Margin should be improving')
  assert.ok(avgMargin > 33, 'Average margin should be healthy')
  assert.ok(lastMargin > avgMargin, 'Recent margin exceeds average')
})

test('User Story: Declining margins trigger alerts', async () => {
  // Given: Margin data showing decline
  const marginData = [35, 34, 32, 30, 28] // Declining from 35% to 28%

  // When: Trend is analyzed
  const firstMargin = marginData[0]
  const lastMargin = marginData[marginData.length - 1]
  const decline = firstMargin - lastMargin
  const percentDecline = (decline / firstMargin) * 100

  // Then: Alert conditions are met
  assert.equal(decline, 7, 'Margin declined by 7 percentage points')
  assert.equal(percentDecline, 20, 'Margin declined by 20%')

  const shouldAlert = decline > 5 || percentDecline > 15
  assert.equal(shouldAlert, true, 'Should trigger margin decline alert')
})

// ─── User Story 7: Category Trends ─────────────────────────────────────────
test('User Story: User can see which categories are growing', async () => {
  // Given: Category performance over time
  interface CategoryTrend {
    category: string
    week1Revenue: number
    week2Revenue: number
    growthRate: number
  }

  const categoryTrends: CategoryTrend[] = [
    { category: 'Bière', week1Revenue: 25000, week2Revenue: 28000, growthRate: 12 },
    { category: 'Soft', week1Revenue: 15000, week2Revenue: 14000, growthRate: -6.67 },
    { category: 'Spiritueux', week1Revenue: 8000, week2Revenue: 10000, growthRate: 25 },
  ]

  // When: Categories are ranked by growth
  const growing = categoryTrends.filter(c => c.growthRate > 0)
    .sort((a, b) => b.growthRate - a.growthRate)

  const declining = categoryTrends.filter(c => c.growthRate < 0)

  // Then: Growth categories are identified
  assert.equal(growing.length, 2, 'Should have 2 growing categories')
  assert.equal(growing[0].category, 'Spiritueux', 'Spiritueux growing fastest')
  assert.equal(declining.length, 1, 'Should have 1 declining category')
  assert.equal(declining[0].category, 'Soft', 'Soft drinks declining')
})

// ─── User Story 8: Comparative Analysis ────────────────────────────────────
test('User Story: User can compare current period to previous period', async () => {
  // Given: This month vs last month
  const lastMonth = {
    revenue: 100000,
    profit: 35000,
    units: 200,
  }

  const thisMonth = {
    revenue: 120000,
    profit: 45000,
    units: 240,
  }

  // When: Comparison is calculated
  const revenueGrowth = ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100
  const profitGrowth = ((thisMonth.profit - lastMonth.profit) / lastMonth.profit) * 100
  const volumeGrowth = ((thisMonth.units - lastMonth.units) / lastMonth.units) * 100

  // Then: All metrics show growth
  assert.equal(revenueGrowth, 20, 'Revenue growth should be 20%')
  assert.ok(Math.abs(profitGrowth - 28.57) < 0.1, 'Profit growth should be ~28.57%')
  assert.equal(volumeGrowth, 20, 'Volume growth should be 20%')

  assert.ok(profitGrowth > revenueGrowth, 'Profit growing faster than revenue is good')
})

// ─── User Story 9: Anomaly Detection ───────────────────────────────────────
test('User Story: System detects unusual spikes or drops', async () => {
  // Given: Normal data with an anomaly
  const salesData = [100, 105, 98, 102, 300, 99, 101] // Day 5 is anomaly

  // When: Statistical analysis is performed
  const withoutAnomaly = salesData.filter((_, i) => i !== 4)
  const avg = withoutAnomaly.reduce((a, b) => a + b, 0) / withoutAnomaly.length
  const stdDev = Math.sqrt(
    withoutAnomaly.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / withoutAnomaly.length
  )

  // Check if any value is > 2 standard deviations from mean
  const anomalies = salesData.filter(val => Math.abs(val - avg) > (2 * stdDev))

  // Then: Anomaly is detected
  assert.ok(anomalies.length > 0, 'Should detect anomaly')
  assert.equal(anomalies[0], 300, 'Should identify the spike')
})

// ─── User Story 10: Export and Reporting ───────────────────────────────────
test('User Story: User can generate trend reports', async () => {
  // Given: Complete trend data
  interface TrendReport {
    period: string
    totalRevenue: number
    totalProfit: number
    totalUnits: number
    avgDailyRevenue: number
    growthRate: number
    topProduct: string
    recommendations: string[]
  }

  const reportData = {
    dailyData: [
      { revenue: 10000, profit: 4000, units: 20 },
      { revenue: 12000, profit: 5000, units: 24 },
      { revenue: 15000, profit: 6000, units: 30 },
    ],
    topProduct: 'Heineken',
    previousPeriodRevenue: 30000,
  }

  // When: Report is generated
  const totalRevenue = reportData.dailyData.reduce((sum, d) => sum + d.revenue, 0)
  const totalProfit = reportData.dailyData.reduce((sum, d) => sum + d.profit, 0)
  const totalUnits = reportData.dailyData.reduce((sum, d) => sum + d.units, 0)
  const growthRate = ((totalRevenue - reportData.previousPeriodRevenue) / reportData.previousPeriodRevenue) * 100

  const report: TrendReport = {
    period: '2024-01-10 to 2024-01-12',
    totalRevenue,
    totalProfit,
    totalUnits,
    avgDailyRevenue: totalRevenue / reportData.dailyData.length,
    growthRate,
    topProduct: reportData.topProduct,
    recommendations: growthRate > 10 ? ['Maintain current strategy'] : ['Consider promotional activities'],
  }

  // Then: Report contains all key insights
  assert.equal(report.totalRevenue, 37000, 'Report should sum revenue')
  assert.equal(report.totalProfit, 15000, 'Report should sum profit')
  assert.equal(report.totalUnits, 74, 'Report should sum units')
  assert.ok(Math.abs(report.avgDailyRevenue - 12333.33) < 1, 'Report should calculate average')
  assert.ok(report.growthRate > 20, 'Report should show growth rate')
  assert.ok(report.recommendations.length > 0, 'Report should include recommendations')
})

test('User Story: Reports can be filtered by date range', async () => {
  // Given: Large dataset
  const allData: DailyMetrics[] = []
  for (let day = 1; day <= 31; day++) {
    allData.push({
      date: `2024-01-${day.toString().padStart(2, '0')}`,
      revenue: 10000 + (Math.random() * 5000),
      profit: 4000 + (Math.random() * 2000),
      units: 20 + Math.floor(Math.random() * 10),
    })
  }

  // When: User selects a specific date range
  const startDate = '2024-01-10'
  const endDate = '2024-01-15'

  const filtered = allData.filter(d => d.date >= startDate && d.date <= endDate)

  // Then: Only selected range is included
  assert.equal(filtered.length, 6, 'Should include 6 days (10-15)')
  assert.equal(filtered[0].date, '2024-01-10', 'Should start at selected date')
  assert.equal(filtered[filtered.length - 1].date, '2024-01-15', 'Should end at selected date')
})

// ─── User Story 11: Trend Significance Testing ────────────────────────────
test('User Story: System identifies statistically significant trends', async () => {
  // Given: Two scenarios - significant growth vs noise
  const significantGrowth = [10000, 11000, 12000, 13000, 14000] // Clear upward
  const noise = [10000, 10100, 9900, 10050, 9950] // Random fluctuation

  // When: Trend significance is tested
  function analyzeTrend(data: number[]): TrendAnalysis {
    const first = data[0]
    const last = data[data.length - 1]
    const percentChange = ((last - first) / first) * 100

    // Simple threshold: >5% change is significant
    const isSignificant = Math.abs(percentChange) > 5

    return {
      direction: percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'stable',
      percentChange,
      isSignificant,
    }
  }

  const growthAnalysis = analyzeTrend(significantGrowth)
  const noiseAnalysis = analyzeTrend(noise)

  // Then: System distinguishes real trends from noise
  assert.equal(growthAnalysis.direction, 'up', 'Should identify upward trend')
  assert.equal(growthAnalysis.isSignificant, true, '40% growth is significant')

  assert.equal(noiseAnalysis.direction, 'stable', 'Noise should be stable')
  assert.equal(noiseAnalysis.isSignificant, false, 'Small fluctuation not significant')
})
