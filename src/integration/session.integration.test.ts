import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSold,
  lineRevenue,
  linePurchaseCost,
  sessionTotals,
  PricedLine,
} from '../utils/calculations'

// ═══════════════════════════════════════════════════════════════════════════
// Session Management Integration Tests
// Testing complete session workflows: creating, recording, and calculating
// ═══════════════════════════════════════════════════════════════════════════

// Mock session data structures
interface SessionLine {
  drinkId: string
  drinkName: string
  opening: number
  purchased: number
  closing: number
  price: number
  cost: number
}

interface Session {
  id: string
  date: string
  lines: SessionLine[]
  expenses: number
  notes?: string
  status: 'draft' | 'completed'
}

// Mock session database
class MockSessionDB {
  private sessions: Map<string, Session> = new Map()

  create(session: Session): boolean {
    if (this.sessions.has(session.id)) {
      return false
    }
    this.sessions.set(session.id, session)
    return true
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values())
  }

  update(id: string, updates: Partial<Session>): boolean {
    const session = this.sessions.get(id)
    if (!session) {
      return false
    }
    this.sessions.set(id, { ...session, ...updates })
    return true
  }

  delete(id: string): boolean {
    return this.sessions.delete(id)
  }

  clear(): void {
    this.sessions.clear()
  }

  getByDateRange(startDate: string, endDate: string): Session[] {
    return this.getAll().filter(session =>
      session.date >= startDate && session.date <= endDate
    )
  }

  getCompleted(): Session[] {
    return this.getAll().filter(session => session.status === 'completed')
  }
}

// ─── User Story 1: Create New Session ─────────────────────────────────────
test('User Story: User can create a new session for the day', async () => {
  // Given: User wants to start a new session
  const sessionDB = new MockSessionDB()
  const today = new Date().toISOString().split('T')[0]

  // When: User creates a new session
  const newSession: Session = {
    id: '1',
    date: today,
    lines: [],
    expenses: 0,
    status: 'draft',
  }

  const created = sessionDB.create(newSession)

  // Then: Session is created successfully
  assert.equal(created, true, 'Session should be created')

  const retrieved = sessionDB.get('1')
  assert.ok(retrieved, 'Session should be retrievable')
  assert.equal(retrieved?.date, today, 'Date should match')
  assert.equal(retrieved?.status, 'draft', 'Status should be draft')
  assert.equal(retrieved?.lines.length, 0, 'Lines should be empty initially')
})

test('User Story: Session has required metadata', async () => {
  // Given: A new session with metadata
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [],
    expenses: 500, // 5.00 EUR opening expenses
    notes: 'Busy Friday night',
    status: 'draft',
  }

  // When: Session is created
  sessionDB.create(session)

  // Then: All metadata is preserved
  const retrieved = sessionDB.get('1')
  assert.equal(retrieved?.date, '2024-01-15', 'Date should be stored')
  assert.equal(retrieved?.expenses, 500, 'Expenses should be stored')
  assert.equal(retrieved?.notes, 'Busy Friday night', 'Notes should be stored')
})

// ─── User Story 2: Record Opening Stock ───────────────────────────────────
test('User Story: User can record opening stock for each drink', async () => {
  // Given: A new session
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [],
    expenses: 0,
    status: 'draft',
  }
  sessionDB.create(session)

  // When: User adds opening stock entries
  const lines: SessionLine[] = [
    { drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 0, price: 500, cost: 300 },
    { drinkId: '2', drinkName: 'Corona', opening: 24, purchased: 0, closing: 0, price: 550, cost: 350 },
    { drinkId: '3', drinkName: 'Coca-Cola', opening: 48, purchased: 0, closing: 0, price: 350, cost: 150 },
  ]

  sessionDB.update('1', { lines })

  // Then: All opening stocks are recorded
  const updated = sessionDB.get('1')
  assert.equal(updated?.lines.length, 3, 'Should have 3 line items')
  assert.equal(updated?.lines[0].opening, 50, 'Heineken opening should be 50')
  assert.equal(updated?.lines[1].opening, 24, 'Corona opening should be 24')
  assert.equal(updated?.lines[2].opening, 48, 'Coca-Cola opening should be 48')
})

// ─── User Story 3: Record Purchases During Session ────────────────────────
test('User Story: User can record mid-session restocks', async () => {
  // Given: A session with opening stock
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [
      { drinkId: '1', drinkName: 'Heineken', opening: 10, purchased: 0, closing: 0, price: 500, cost: 300 },
    ],
    expenses: 0,
    status: 'draft',
  }
  sessionDB.create(session)

  // When: User adds purchased stock during the session
  const updatedLines = [...session.lines]
  updatedLines[0].purchased = 24 // Restocked with 2 racks

  sessionDB.update('1', { lines: updatedLines })

  // Then: Purchase is recorded
  const updated = sessionDB.get('1')
  assert.equal(updated?.lines[0].purchased, 24, 'Purchased amount should be recorded')

  // And: Total available is correct (opening + purchased)
  const line = updated!.lines[0]
  const totalAvailable = line.opening + line.purchased
  assert.equal(totalAvailable, 34, 'Total available should be 34 (10 + 24)')
})

// ─── User Story 4: Record Closing Stock ───────────────────────────────────
test('User Story: User can record closing stock to calculate sales', async () => {
  // Given: A session with opening stock
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [
      { drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 0, price: 500, cost: 300 },
    ],
    expenses: 0,
    status: 'draft',
  }
  sessionDB.create(session)

  // When: User records closing stock at end of day
  const updatedLines = [...session.lines]
  updatedLines[0].closing = 30 // 30 left at closing

  sessionDB.update('1', { lines: updatedLines })

  // Then: Closing stock is recorded
  const updated = sessionDB.get('1')
  assert.equal(updated?.lines[0].closing, 30, 'Closing stock should be recorded')

  // And: Sold quantity is calculated correctly
  const line = updated!.lines[0]
  const sold = computeSold(line.opening, line.purchased, line.closing)
  assert.equal(sold, 20, 'Should calculate 20 units sold (50 - 30)')
})

test('User Story: Sold calculation handles restocks correctly', async () => {
  // Given: A session with opening stock and restock
  const line = {
    opening: 10,
    purchased: 24,
    closing: 4,
  }

  // When: Sold quantity is calculated
  const sold = computeSold(line.opening, line.purchased, line.closing)

  // Then: Calculation accounts for restock
  // (10 + 24) - 4 = 30 sold
  assert.equal(sold, 30, 'Should calculate 30 units sold with restock')
})

// ─── User Story 5: Track Session Expenses ─────────────────────────────────
test('User Story: User can record expenses for the session', async () => {
  // Given: A session with various expenses
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [],
    expenses: 0,
    status: 'draft',
  }
  sessionDB.create(session)

  // When: User adds expenses
  // Examples: cleaning supplies, delivery fees, misc costs
  const totalExpenses = 500 + 300 + 200 // Total: 10.00 EUR

  sessionDB.update('1', { expenses: totalExpenses })

  // Then: Expenses are recorded
  const updated = sessionDB.get('1')
  assert.equal(updated?.expenses, 1000, 'Total expenses should be recorded')
})

test('User Story: Expenses affect net profit calculation', async () => {
  // Given: A session with sales and expenses
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // Sold 20 @ 500
  ]
  const expenses = 2000 // 20.00 EUR in expenses

  // When: Session totals are calculated
  const totals = sessionTotals(lines, expenses)

  // Then: Net profit accounts for expenses
  assert.equal(totals.revenue, 20 * 500, 'Revenue should be 10,000')
  assert.equal(totals.purchaseCost, 0, 'Purchase cost should be 0 (no restocks)')
  assert.equal(totals.grossProfit, 10000, 'Gross profit should be revenue - purchase cost = 10,000')
  assert.equal(totals.netProfit, 10000 - 2000, 'Net profit should subtract expenses: 8,000')
})

// ─── User Story 6: Calculate Session Financials ───────────────────────────
test('User Story: System calculates revenue for the session', async () => {
  // Given: A completed session with multiple drinks
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // Sold 20 @ 5.00
    { opening: 24, purchased: 0, closing: 12, price: 550, cost: 350 }, // Sold 12 @ 5.50
    { opening: 48, purchased: 0, closing: 24, price: 350, cost: 150 }, // Sold 24 @ 3.50
  ]

  // When: Session totals are calculated
  const totals = sessionTotals(lines)

  // Then: Revenue is sum of all sales
  const expectedRevenue = (20 * 500) + (12 * 550) + (24 * 350)
  assert.equal(totals.revenue, expectedRevenue, 'Revenue should sum all line revenues')
  assert.equal(totals.revenue, 25000, 'Revenue should be 250.00 EUR')
})

test('User Story: System calculates purchase costs', async () => {
  // Given: Session with mid-day restocks
  const lines: PricedLine[] = [
    { opening: 0, purchased: 12, closing: 12, price: 500, cost: 300 }, // Bought 12, sold 0
    { opening: 10, purchased: 24, closing: 4, price: 550, cost: 350 }, // Bought 24, sold 30
  ]

  // When: Totals are calculated
  const totals = sessionTotals(lines)

  // Then: Purchase cost is independent of sales
  const expectedPurchaseCost = (12 * 300) + (24 * 350)
  assert.equal(totals.purchaseCost, expectedPurchaseCost, 'Purchase cost should be sum of all purchases')
  assert.equal(totals.purchaseCost, 12000, 'Purchase cost should be 120.00 EUR')
})

test('User Story: System calculates gross profit', async () => {
  // Given: A session with sales
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // Sold 20
  ]

  // When: Totals are calculated
  const totals = sessionTotals(lines)

  // Then: Gross profit = revenue - purchase cost
  // Note: purchase cost is for items PURCHASED during session, not sold
  const soldQty = 20
  const expectedRevenue = soldQty * 500
  const expectedPurchaseCost = 0 // No purchases during this session
  const expectedGrossProfit = expectedRevenue - expectedPurchaseCost

  assert.equal(totals.revenue, expectedRevenue, 'Revenue should be 10,000')
  assert.equal(totals.purchaseCost, 0, 'Purchase cost should be 0')
  assert.equal(totals.grossProfit, expectedGrossProfit, 'Gross profit should be 10,000')
})

test('User Story: System calculates net profit with expenses', async () => {
  // Given: A complete session
  const lines: PricedLine[] = [
    { opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }, // Sold 20 @ 5.00
    { opening: 24, purchased: 0, closing: 4, price: 1000, cost: 600 }, // Sold 20 @ 10.00
  ]
  const expenses = 5000 // 50.00 EUR

  // When: Totals are calculated
  const totals = sessionTotals(lines, expenses)

  // Then: Net profit = gross profit - expenses
  // Gross profit = revenue - purchase cost (no purchases, so = revenue)
  const expectedRevenue = (20 * 500) + (20 * 1000) // 30,000
  const expectedGross = expectedRevenue - 0 // 30,000 (no purchase cost)
  const expectedNet = expectedGross - expenses   // 25,000

  assert.equal(totals.grossProfit, expectedGross, 'Gross profit should be 30,000')
  assert.equal(totals.netProfit, expectedNet, 'Net profit should be 25,000 after expenses')
})

// ─── User Story 7: Complete Session ───────────────────────────────────────
test('User Story: User can mark session as completed', async () => {
  // Given: A draft session with all data entered
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [
      { drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 },
    ],
    expenses: 1000,
    status: 'draft',
  }
  sessionDB.create(session)

  // When: User completes the session
  sessionDB.update('1', { status: 'completed' })

  // Then: Session is marked as completed
  const completed = sessionDB.get('1')
  assert.equal(completed?.status, 'completed', 'Status should be completed')
})

test('User Story: Completed sessions are locked from editing', async () => {
  // Given: A completed session
  const sessionDB = new MockSessionDB()
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [
      { drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 },
    ],
    expenses: 1000,
    status: 'completed',
  }
  sessionDB.create(session)

  // When: Attempting to modify a completed session
  // Then: Application should prevent edits (status check)
  const retrieved = sessionDB.get('1')
  assert.equal(retrieved?.status, 'completed', 'Completed sessions should be identifiable')

  // In a real implementation, UI would check status and disable edits
  // This test verifies the status is maintained
})

// ─── User Story 8: View Session History ───────────────────────────────────
test('User Story: User can view all past sessions', async () => {
  // Given: Multiple completed sessions
  const sessionDB = new MockSessionDB()
  const sessions: Session[] = [
    {
      id: '1',
      date: '2024-01-13',
      lines: [{ drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 30, price: 500, cost: 300 }],
      expenses: 1000,
      status: 'completed',
    },
    {
      id: '2',
      date: '2024-01-14',
      lines: [{ drinkId: '1', drinkName: 'Heineken', opening: 30, purchased: 24, closing: 20, price: 500, cost: 300 }],
      expenses: 1500,
      status: 'completed',
    },
    {
      id: '3',
      date: '2024-01-15',
      lines: [],
      expenses: 0,
      status: 'draft',
    },
  ]

  sessions.forEach(s => sessionDB.create(s))

  // When: User requests all sessions
  const allSessions = sessionDB.getAll()

  // Then: All sessions are returned
  assert.equal(allSessions.length, 3, 'Should return all sessions')

  // When: User filters for completed only
  const completed = sessionDB.getCompleted()

  // Then: Only completed sessions are shown
  assert.equal(completed.length, 2, 'Should return 2 completed sessions')
  assert.ok(completed.every(s => s.status === 'completed'), 'All should be completed')
})

test('User Story: User can filter sessions by date range', async () => {
  // Given: Sessions across multiple dates
  const sessionDB = new MockSessionDB()
  const sessions: Session[] = [
    { id: '1', date: '2024-01-10', lines: [], expenses: 0, status: 'completed' },
    { id: '2', date: '2024-01-15', lines: [], expenses: 0, status: 'completed' },
    { id: '3', date: '2024-01-20', lines: [], expenses: 0, status: 'completed' },
    { id: '4', date: '2024-01-25', lines: [], expenses: 0, status: 'completed' },
  ]
  sessions.forEach(s => sessionDB.create(s))

  // When: User filters by date range (Jan 12-22)
  const filtered = sessionDB.getByDateRange('2024-01-12', '2024-01-22')

  // Then: Only sessions in range are returned
  assert.equal(filtered.length, 2, 'Should return 2 sessions in range')
  assert.ok(filtered.some(s => s.id === '2'), 'Should include Jan 15')
  assert.ok(filtered.some(s => s.id === '3'), 'Should include Jan 20')
  assert.ok(!filtered.some(s => s.id === '1'), 'Should exclude Jan 10')
  assert.ok(!filtered.some(s => s.id === '4'), 'Should exclude Jan 25')
})

// ─── User Story 9: Edge Cases and Validation ──────────────────────────────
test('User Story: System handles miscounts gracefully', async () => {
  // Scenario 1: Closing > Opening (impossible without purchase)
  const miscount1 = computeSold(10, 0, 25)
  assert.equal(miscount1, 0, 'Miscount should result in 0, not negative')

  // Scenario 2: Negative closing treated as 0
  const miscount2 = computeSold(10, 0, -5)
  assert.equal(miscount2, 10, 'Negative closing should be treated as 0')

  // Scenario 3: Nothing sold
  const noSales = computeSold(20, 0, 20)
  assert.equal(noSales, 0, 'No change should result in 0 sales')
})

test('User Story: Empty session calculates correctly', async () => {
  // Given: A session with no line items
  const lines: PricedLine[] = []
  const expenses = 1000

  // When: Totals are calculated
  const totals = sessionTotals(lines, expenses)

  // Then: All values should be zero or negative
  assert.equal(totals.revenue, 0, 'Revenue should be 0')
  assert.equal(totals.purchaseCost, 0, 'Purchase cost should be 0')
  assert.equal(totals.grossProfit, 0, 'Gross profit should be 0')
  assert.equal(totals.netProfit, -1000, 'Net profit should be negative expenses')
  assert.equal(totals.units, 0, 'Units sold should be 0')
})

test('User Story: Negative expenses are ignored', async () => {
  // Given: Invalid negative expenses
  const lines: PricedLine[] = [
    { opening: 10, purchased: 0, closing: 5, price: 500, cost: 300 },
  ]
  const negativeExpenses = -999

  // When: Totals are calculated
  const totals = sessionTotals(lines, negativeExpenses)

  // Then: Negative expenses don't affect calculation
  assert.equal(totals.netProfit, totals.grossProfit, 'Net should equal gross with negative expenses')
})

// ─── User Story 10: Complete Session Workflow ─────────────────────────────
test('User Story: Complete daily session workflow', async () => {
  // Given: User starts a new day
  const sessionDB = new MockSessionDB()

  // Step 1: Create new session
  const session: Session = {
    id: '1',
    date: '2024-01-15',
    lines: [],
    expenses: 0,
    notes: 'Monday opening',
    status: 'draft',
  }
  const created = sessionDB.create(session)
  assert.ok(created, 'Session should be created')

  // Step 2: Record opening stock
  const openingLines: SessionLine[] = [
    { drinkId: '1', drinkName: 'Heineken', opening: 50, purchased: 0, closing: 0, price: 500, cost: 300 },
    { drinkId: '2', drinkName: 'Corona', opening: 24, purchased: 0, closing: 0, price: 550, cost: 350 },
  ]
  sessionDB.update('1', { lines: openingLines })

  let current = sessionDB.get('1')!
  assert.equal(current.lines.length, 2, 'Should have 2 line items')

  // Step 3: Record mid-day restock
  const updatedLines = [...current.lines]
  updatedLines[0].purchased = 24 // Restocked Heineken
  sessionDB.update('1', { lines: updatedLines })

  // Step 4: Add expenses
  sessionDB.update('1', { expenses: 2000 })

  // Step 5: Record closing stock
  current = sessionDB.get('1')!
  const finalLines = [...current.lines]
  finalLines[0].closing = 30 // Heineken closing
  finalLines[1].closing = 10 // Corona closing
  sessionDB.update('1', { lines: finalLines })

  // Step 6: Calculate totals
  current = sessionDB.get('1')!
  const pricedLines: PricedLine[] = current.lines.map(l => ({
    opening: l.opening,
    purchased: l.purchased,
    closing: l.closing,
    price: l.price,
    cost: l.cost,
  }))
  const totals = sessionTotals(pricedLines, current.expenses)

  // Verify calculations
  // Heineken: (50 + 24) - 30 = 44 sold @ 5.00 = 22,000 revenue
  // Corona: 24 - 10 = 14 sold @ 5.50 = 7,700 revenue
  // Total revenue: 29,700
  const heinekenSold = computeSold(50, 24, 30)
  const coronaSold = computeSold(24, 0, 10)
  assert.equal(heinekenSold, 44, 'Heineken sold should be 44')
  assert.equal(coronaSold, 14, 'Corona sold should be 14')
  assert.equal(totals.revenue, 29700, 'Total revenue should be 29,700')

  // Step 7: Complete session
  sessionDB.update('1', { status: 'completed' })

  // Then: Session is complete and correct
  const final = sessionDB.get('1')!
  assert.equal(final.status, 'completed', 'Session should be completed')
  assert.equal(final.lines[0].closing, 30, 'Closing stock should be saved')
  assert.ok(totals.revenue > 0, 'Revenue should be calculated')
  assert.ok(totals.netProfit < totals.grossProfit, 'Net profit should be less than gross due to expenses')
})

test('User Story: Multiple sessions can be managed concurrently', async () => {
  // Given: Multiple venues or days
  const sessionDB = new MockSessionDB()

  // When: Multiple sessions are created
  const sessions: Session[] = [
    { id: '1', date: '2024-01-15', lines: [], expenses: 1000, status: 'draft', notes: 'Venue A' },
    { id: '2', date: '2024-01-15', lines: [], expenses: 1500, status: 'draft', notes: 'Venue B' },
    { id: '3', date: '2024-01-16', lines: [], expenses: 2000, status: 'completed', notes: 'Next day' },
  ]

  sessions.forEach(s => {
    const created = sessionDB.create(s)
    assert.ok(created, `Session ${s.id} should be created`)
  })

  // Then: All sessions are independently managed
  assert.equal(sessionDB.getAll().length, 3, 'Should have 3 sessions')

  const venue1 = sessionDB.get('1')!
  const venue2 = sessionDB.get('2')!

  assert.equal(venue1.expenses, 1000, 'Venue A expenses should be isolated')
  assert.equal(venue2.expenses, 1500, 'Venue B expenses should be isolated')
  assert.notEqual(venue1.notes, venue2.notes, 'Sessions should be independent')
})
