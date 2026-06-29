// Pure business calculations for BarTrack — no React/RN imports so they are
// unit-testable in isolation. All money values are integers (FCFA).

export interface PricedLine {
  price: number
  cost: number
  opening: number
  purchased: number
  closing: number
}

/**
 * Units sold for a line. Clamped at 0 so a miscount where the closing count is
 * higher than what was available never produces phantom negative sales.
 */
export function computeSold(opening: number, purchased: number, closing: number): number {
  const expected = opening + purchased
  return Math.max(0, expected - Math.max(0, closing))
}

export function lineRevenue(line: PricedLine): number {
  return computeSold(line.opening, line.purchased, line.closing) * Math.max(0, line.price)
}

/** Purchase cost is driven by what was actually bought, independent of sales. */
export function linePurchaseCost(line: PricedLine): number {
  return Math.max(0, line.purchased) * Math.max(0, line.cost)
}

export interface SessionTotals {
  revenue: number
  purchaseCost: number
  grossProfit: number
  netProfit: number
  units: number
}

/**
 * Roll up a session. `expenses` are same-day operating costs (salaries, rent…)
 * separate from stock purchases. Net = revenue − purchases − expenses.
 */
export function sessionTotals(lines: PricedLine[], expenses = 0): SessionTotals {
  let revenue = 0
  let purchaseCost = 0
  let units = 0
  for (const l of lines) {
    revenue += lineRevenue(l)
    purchaseCost += linePurchaseCost(l)
    units += computeSold(l.opening, l.purchased, l.closing)
  }
  const grossProfit = revenue - purchaseCost
  const safeExpenses = Math.max(0, expenses)
  return {
    revenue,
    purchaseCost,
    grossProfit,
    netProfit: grossProfit - safeExpenses,
    units,
  }
}

/** Profit margin as a percentage of revenue. 0 when there is no revenue. */
export function marginPct(revenue: number, profit: number): number {
  if (revenue <= 0) return 0
  return (profit / revenue) * 100
}

/** Markup of selling price over cost, per unit, as a percentage. */
export function markupPct(price: number, cost: number): number {
  if (cost <= 0) return 0
  return ((price - cost) / cost) * 100
}

export type StockStatus = 'rupture' | 'low' | 'medium' | 'ok'

export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return 'rupture'
  if (stock <= minStock) return 'low'
  if (stock <= minStock * 1.5) return 'medium'
  return 'ok'
}

/** Stock as a percentage of a "healthy" target (2× the minimum), clamped 0–100. */
export function stockPct(stock: number, minStock: number): number {
  const target = Math.max(minStock * 2, 1)
  return Math.min(100, Math.max(0, Math.round((stock / target) * 100)))
}

/** Days of stock left given an average daily sales rate. Infinity if no sales. */
export function daysOfCover(stock: number, avgDailySold: number): number {
  if (avgDailySold <= 0) return Infinity
  return stock / avgDailySold
}

/** Split a unit count into racks (cassiers) + remainder for a given rack size. */
export function splitRacks(units: number, rackSize: number): { racks: number; remainder: number } {
  const size = Math.max(1, Math.floor(rackSize))
  const u = Math.max(0, Math.floor(units))
  return { racks: Math.floor(u / size), remainder: u % size }
}
