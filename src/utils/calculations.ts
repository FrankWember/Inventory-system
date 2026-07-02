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

/**
 * Label for a stock count expressed in cassiers + units,
 * e.g. "2 cassiers + 6 unités" (fr) / "2 crates + 6 units" (en) / "2c + 6u" (short).
 */
export function cassierLabel(units: number, rackSize: number, short = false, lang: 'fr' | 'en' = 'fr'): string {
  const { racks, remainder } = splitRacks(units, rackSize)

  if (short) {
    if (racks === 0) return `${remainder}u`
    if (remainder === 0) return `${racks}c`
    return `${racks}c + ${remainder}u`
  }

  const unitNoun = lang === 'en' ? 'unit' : 'unité'
  const rackNoun = lang === 'en' ? 'crate' : 'cassier'
  const unitWord = (n: number) => `${n} ${unitNoun}${n > 1 ? 's' : ''}`
  const rackWord = (n: number) => `${n} ${rackNoun}${n > 1 ? 's' : ''}`
  if (racks === 0) return unitWord(remainder)
  if (remainder === 0) return rackWord(racks)
  return `${rackWord(racks)} + ${unitWord(remainder)}`
}

/**
 * True when `dateISO` (YYYY-MM-DD) falls within the last `days` days ending at
 * `todayISO` inclusive — e.g. days=7 covers today and the 6 days before.
 * Pure string/date math on local dates; no timezone conversion.
 */
export function isWithinLastDays(dateISO: string, days: number, todayISO: string): boolean {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  const date = parse(dateISO)
  const today = parse(todayISO)
  if (Number.isNaN(date) || Number.isNaN(today)) return false
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.round((today - date) / dayMs)
  return diffDays >= 0 && diffDays < days
}

/** ISO date (YYYY-MM-DD) `days` days before `todayISO`, on local dates. */
export function isoDaysAgo(days: number, todayISO: string): string {
  const [y, m, d] = todayISO.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
