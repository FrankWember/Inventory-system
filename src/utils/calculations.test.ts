import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSold,
  lineRevenue,
  linePurchaseCost,
  purchaseCost,
  sessionTotals,
  marginPct,
  markupPct,
  stockStatus,
  stockPct,
  daysOfCover,
  splitRacks,
  PricedLine,
} from './calculations'

// ─── computeSold ──────────────────────────────────────────────────────────
test('computeSold: normal day', () => {
  assert.equal(computeSold(50, 0, 30), 20) // opened 50, sold down to 30
})
test('computeSold: with restock', () => {
  assert.equal(computeSold(10, 24, 4), 30) // 10 + 24 = 34 available, 4 left
})
test('computeSold: nothing sold', () => {
  assert.equal(computeSold(20, 0, 20), 0)
})
test('computeSold: miscount where closing > available is clamped to 0', () => {
  assert.equal(computeSold(10, 0, 25), 0) // never negative
})
test('computeSold: negative closing treated as 0', () => {
  assert.equal(computeSold(10, 0, -5), 10)
})

// ─── line money ───────────────────────────────────────────────────────────
const line = (o: number, p: number, c: number, price = 500, cost = 300): PricedLine => ({
  opening: o, purchased: p, closing: c, price, cost,
})

test('lineRevenue uses sold * price', () => {
  assert.equal(lineRevenue(line(50, 0, 30, 500)), 20 * 500)
})
test('linePurchaseCost is independent of sales', () => {
  assert.equal(linePurchaseCost(line(0, 12, 12, 500, 300)), 12 * 300) // bought 12, sold 0
})

// ─── purchaseCost (crate-aware) ─────────────────────────────────────────────
test('purchaseCost: full crates billed at crate price, not rounded unit cost', () => {
  // Beaufort: crate of 12 at 6800 → unit cost rounds to 567; 36 units must be 20400, not 20412
  assert.equal(purchaseCost(36, 567, 12, 6800), 3 * 6800)
})
test('purchaseCost: loose units outside full crates use unit cost', () => {
  assert.equal(purchaseCost(38, 567, 12, 6800), 3 * 6800 + 2 * 567)
})
test('purchaseCost: falls back to units × unit cost without a crate price', () => {
  assert.equal(purchaseCost(36, 567, 12), 36 * 567)
  assert.equal(purchaseCost(36, 567, 12, 0), 36 * 567)
})
test('purchaseCost: rack size 1 ignores crate price', () => {
  assert.equal(purchaseCost(5, 500, 1, 9999), 5 * 500)
})
test('purchaseCost: negative or zero units cost nothing', () => {
  assert.equal(purchaseCost(0, 567, 12, 6800), 0)
  assert.equal(purchaseCost(-3, 567, 12, 6800), 0)
})

// ─── sessionTotals ──────────────────────────────────────────────────────────
test('sessionTotals: revenue, purchases, gross & net', () => {
  const lines = [
    line(50, 0, 30, 500, 300), // sold 20 → rev 10000, no purchase
    line(0, 12, 4, 1000, 600), // bought 12 (cost 7200), sold 8 → rev 8000
  ]
  const t = sessionTotals(lines, 2000) // 2000 of same-day expenses
  assert.equal(t.revenue, 10000 + 8000)
  assert.equal(t.purchaseCost, 12 * 600)
  assert.equal(t.units, 20 + 8)
  assert.equal(t.grossProfit, 18000 - 7200)
  assert.equal(t.netProfit, 18000 - 7200 - 2000)
})
test('sessionTotals: empty session is all zeros', () => {
  const t = sessionTotals([])
  assert.deepEqual(t, { revenue: 0, purchaseCost: 0, grossProfit: 0, netProfit: 0, units: 0 })
})
test('sessionTotals: negative expenses ignored', () => {
  const t = sessionTotals([line(10, 0, 5, 500, 300)], -999)
  assert.equal(t.netProfit, t.grossProfit)
})

// ─── margins ────────────────────────────────────────────────────────────────
test('marginPct: zero revenue → 0 (no divide by zero)', () => {
  assert.equal(marginPct(0, 0), 0)
})
test('marginPct: typical', () => {
  assert.equal(marginPct(1000, 250), 25)
})
test('markupPct: zero cost → 0', () => {
  assert.equal(markupPct(500, 0), 0)
})
test('markupPct: price 500 cost 300 → ~66.7%', () => {
  assert.ok(Math.abs(markupPct(500, 300) - 66.666) < 0.01)
})

// ─── stock status ───────────────────────────────────────────────────────────
test('stockStatus thresholds', () => {
  assert.equal(stockStatus(0, 6), 'rupture')
  assert.equal(stockStatus(6, 6), 'low')
  assert.equal(stockStatus(8, 6), 'medium') // <= 1.5×min
  assert.equal(stockStatus(20, 6), 'ok')
})
test('stockPct clamps 0–100', () => {
  assert.equal(stockPct(0, 6), 0)
  assert.equal(stockPct(100, 6), 100)
  assert.equal(stockPct(6, 6), 50) // target = 12
})
test('stockPct: min 0 does not divide by zero', () => {
  assert.equal(stockPct(5, 0), 100)
})

// ─── days of cover ──────────────────────────────────────────────────────────
test('daysOfCover: no sales → Infinity', () => {
  assert.equal(daysOfCover(10, 0), Infinity)
})
test('daysOfCover: 30 stock at 6/day → 5 days', () => {
  assert.equal(daysOfCover(30, 6), 5)
})

// ─── rack splitting ─────────────────────────────────────────────────────────
test('splitRacks: 30 beers at 12/rack → 2 racks + 6', () => {
  assert.deepEqual(splitRacks(30, 12), { racks: 2, remainder: 6 })
})
test('splitRacks: exact multiple', () => {
  assert.deepEqual(splitRacks(24, 12), { racks: 2, remainder: 0 })
})
test('splitRacks: rackSize 0 falls back to 1', () => {
  assert.deepEqual(splitRacks(5, 0), { racks: 5, remainder: 0 })
})
