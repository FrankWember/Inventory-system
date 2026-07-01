import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cassierLabel, isWithinLastDays, isoDaysAgo } from './calculations'

// ─── cassierLabel (variable rack sizes — the old formatter hardcoded 12) ────

test('cassierLabel: 30 units at 12/rack → "2 cassiers + 6 unités"', () => {
  assert.equal(cassierLabel(30, 12), '2 cassiers + 6 unités')
})

test('cassierLabel: exact multiple omits the remainder', () => {
  assert.equal(cassierLabel(24, 12), '2 cassiers')
})

test('cassierLabel: below one rack shows only units', () => {
  assert.equal(cassierLabel(5, 12), '5 unités')
})

test('cassierLabel: singular forms', () => {
  assert.equal(cassierLabel(13, 12), '1 cassier + 1 unité')
  assert.equal(cassierLabel(1, 12), '1 unité')
})

test('cassierLabel: zero units', () => {
  assert.equal(cassierLabel(0, 12), '0 unité')
})

test('cassierLabel: respects non-12 rack sizes', () => {
  assert.equal(cassierLabel(30, 24), '1 cassier + 6 unités')
  assert.equal(cassierLabel(30, 6), '5 cassiers')
})

test('cassierLabel: short form', () => {
  assert.equal(cassierLabel(30, 12, true), '2c + 6u')
  assert.equal(cassierLabel(24, 12, true), '2c')
  assert.equal(cassierLabel(5, 12, true), '5u')
})

test('cassierLabel: guards against rackSize 0 and negatives', () => {
  assert.equal(cassierLabel(5, 0), '5 cassiers') // falls back to rack of 1
  assert.equal(cassierLabel(-3, 12), '0 unité') // negative stock clamps to 0
})

// ─── isWithinLastDays ────────────────────────────────────────────────────────

test('isWithinLastDays: today and 6 days ago are inside a 7-day window', () => {
  assert.equal(isWithinLastDays('2026-07-01', 7, '2026-07-01'), true)
  assert.equal(isWithinLastDays('2026-06-25', 7, '2026-07-01'), true)
})

test('isWithinLastDays: 7 days ago is outside a 7-day window', () => {
  assert.equal(isWithinLastDays('2026-06-24', 7, '2026-07-01'), false)
})

test('isWithinLastDays: future dates are excluded', () => {
  assert.equal(isWithinLastDays('2026-07-02', 7, '2026-07-01'), false)
})

test('isWithinLastDays: crosses month and year boundaries', () => {
  assert.equal(isWithinLastDays('2025-12-30', 7, '2026-01-03'), true)
  assert.equal(isWithinLastDays('2025-12-26', 7, '2026-01-03'), false)
})

test('isWithinLastDays: invalid date strings return false', () => {
  assert.equal(isWithinLastDays('not-a-date', 7, '2026-07-01'), false)
  assert.equal(isWithinLastDays('', 7, '2026-07-01'), false)
})

// ─── isoDaysAgo ──────────────────────────────────────────────────────────────

test('isoDaysAgo: simple subtraction', () => {
  assert.equal(isoDaysAgo(7, '2026-07-15'), '2026-07-08')
})

test('isoDaysAgo: crosses month boundary', () => {
  assert.equal(isoDaysAgo(7, '2026-07-03'), '2026-06-26')
})

test('isoDaysAgo: crosses year boundary', () => {
  assert.equal(isoDaysAgo(30, '2026-01-15'), '2025-12-16')
})

test('isoDaysAgo: zero days is identity', () => {
  assert.equal(isoDaysAgo(0, '2026-07-01'), '2026-07-01')
})

test('isoDaysAgo + isWithinLastDays: fetch cutoff matches the filter window', () => {
  // The dashboard fetches sessions with date >= isoDaysAgo(7, today) and then
  // filters with isWithinLastDays(date, 7, today). The cutoff day itself is
  // fetched but filtered out — never the other way around (which would drop data).
  const today = '2026-07-01'
  const cutoff = isoDaysAgo(7, today)
  assert.equal(isWithinLastDays(cutoff, 7, today), false)
  const dayAfterCutoff = isoDaysAgo(6, today)
  assert.equal(isWithinLastDays(dayAfterCutoff, 7, today), true)
})
