import { test } from 'node:test'
import assert from 'node:assert/strict'

// ─── Test Types ──────────────────────────────────────────────────────────────

interface Drink {
  id: string
  name: string
  price: number
  cost: number
  stock: number
}

interface Expense {
  amount: number
}

// ─── Test Builders ───────────────────────────────────────────────────────────

let idSeq = 0
const nextId = () => `drink-${++idSeq}`

function drink(partial: Partial<Drink>): Drink {
  return {
    id: nextId(),
    name: 'Test Drink',
    price: 600,
    cost: 500,
    stock: 50,
    ...partial,
  }
}

function expense(amount: number): Expense {
  return { amount }
}

// ─── Calculation Functions ───────────────────────────────────────────────────

/**
 * Calculate expected stock (opening + purchases)
 */
function getExpected(opening: number, purchased: number): number {
  return opening + purchased
}

/**
 * Calculate sold units
 * Formula: Sold = (Opening Stock + Purchases) - Closing Stock
 */
function getSold(opening: number, purchased: number, closing: number): number {
  const expected = getExpected(opening, purchased)
  return Math.max(0, expected - closing)
}

/**
 * Calculate revenue from sales
 * Formula: Revenue = Sold Units × Price per Unit
 */
function getRevenue(sold: number, price: number): number {
  return sold * price
}

/**
 * Calculate purchase cost
 * Formula: Purchase Cost = Purchased Units × Cost per Unit
 */
function getPurchaseCost(purchased: number, cost: number): number {
  return purchased * cost
}

/**
 * Calculate opening stock value
 * Formula: Opening Stock Value = Opening Stock × Cost per Unit
 */
function getOpeningStockValue(opening: number, cost: number): number {
  return opening * cost
}

/**
 * Calculate closing stock value
 * Formula: Closing Stock Value = Closing Stock × Cost per Unit
 */
function getClosingStockValue(closing: number, cost: number): number {
  return closing * cost
}

/**
 * Calculate total revenue for multiple drinks
 */
function getTotalRevenue(drinks: Drink[], soldByDrink: Record<string, number>): number {
  return drinks.reduce((sum, d) => sum + (soldByDrink[d.id] || 0) * d.price, 0)
}

/**
 * Calculate total purchase cost for multiple drinks
 */
function getTotalPurchaseCost(drinks: Drink[], purchasedByDrink: Record<string, number>): number {
  return drinks.reduce((sum, d) => sum + (purchasedByDrink[d.id] || 0) * d.cost, 0)
}

/**
 * Calculate total expenses
 */
function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

/**
 * Calculate gross profit
 * Formula: Gross Profit = Revenue - Purchase Cost
 */
function getGrossProfit(revenue: number, purchaseCost: number): number {
  return revenue - purchaseCost
}

/**
 * Calculate net profit
 * Formula: Net Profit = Gross Profit - Operating Expenses
 */
function getNetProfit(grossProfit: number, expenses: number): number {
  return grossProfit - expenses
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('getSold: basic calculation', () => {
  // Opening 50 + Purchased 24 - Closing 60 = Sold 14
  const sold = getSold(50, 24, 60)
  assert.equal(sold, 14)
})

test('getSold: no purchases, some sales', () => {
  // Opening 50 + Purchased 0 - Closing 40 = Sold 10
  const sold = getSold(50, 0, 40)
  assert.equal(sold, 10)
})

test('getSold: zero sales (closing equals expected)', () => {
  // Opening 50 + Purchased 24 - Closing 74 = Sold 0
  const sold = getSold(50, 24, 74)
  assert.equal(sold, 0)
})

test('getSold: cannot be negative (closing > expected)', () => {
  // If closing > expected, sold should be 0 (not negative)
  // This can happen due to counting errors
  const sold = getSold(50, 24, 80)
  assert.equal(sold, 0)
})

test('getSold: all stock sold', () => {
  // Opening 50 + Purchased 24 - Closing 0 = Sold 74
  const sold = getSold(50, 24, 0)
  assert.equal(sold, 74)
})

test('getRevenue: basic calculation', () => {
  // 14 units × 600 FCFA = 8,400 FCFA
  const revenue = getRevenue(14, 600)
  assert.equal(revenue, 8400)
})

test('getRevenue: zero sales', () => {
  const revenue = getRevenue(0, 600)
  assert.equal(revenue, 0)
})

test('getRevenue: large quantity', () => {
  // 100 units × 500 FCFA = 50,000 FCFA
  const revenue = getRevenue(100, 500)
  assert.equal(revenue, 50000)
})

test('getPurchaseCost: basic calculation', () => {
  // 24 units × 500 FCFA = 12,000 FCFA
  const cost = getPurchaseCost(24, 500)
  assert.equal(cost, 12000)
})

test('getPurchaseCost: zero purchases', () => {
  const cost = getPurchaseCost(0, 500)
  assert.equal(cost, 0)
})

test('getOpeningStockValue: basic calculation', () => {
  // 50 units × 500 FCFA = 25,000 FCFA
  const value = getOpeningStockValue(50, 500)
  assert.equal(value, 25000)
})

test('getOpeningStockValue: zero stock', () => {
  const value = getOpeningStockValue(0, 500)
  assert.equal(value, 0)
})

test('getClosingStockValue: basic calculation', () => {
  // 60 units × 500 FCFA = 30,000 FCFA
  const value = getClosingStockValue(60, 500)
  assert.equal(value, 30000)
})

test('getClosingStockValue: zero stock', () => {
  const value = getClosingStockValue(0, 500)
  assert.equal(value, 0)
})

test('getExpected: opening plus purchases', () => {
  // Opening 50 + Purchased 24 = Expected 74
  const expected = getExpected(50, 24)
  assert.equal(expected, 74)
})

test('getTotalRevenue: multiple drinks', () => {
  const drinks = [
    drink({ id: 'd1', price: 600 }),
    drink({ id: 'd2', price: 500 }),
    drink({ id: 'd3', price: 700 }),
  ]
  const sold = {
    d1: 10, // 10 × 600 = 6,000
    d2: 15, // 15 × 500 = 7,500
    d3: 8,  // 8 × 700 = 5,600
  }
  // Total: 6,000 + 7,500 + 5,600 = 19,100
  const total = getTotalRevenue(drinks, sold)
  assert.equal(total, 19100)
})

test('getTotalRevenue: some drinks with zero sales', () => {
  const drinks = [
    drink({ id: 'd1', price: 600 }),
    drink({ id: 'd2', price: 500 }),
  ]
  const sold = {
    d1: 10, // 10 × 600 = 6,000
    d2: 0,  // 0 × 500 = 0
  }
  const total = getTotalRevenue(drinks, sold)
  assert.equal(total, 6000)
})

test('getTotalPurchaseCost: multiple drinks', () => {
  const drinks = [
    drink({ id: 'd1', cost: 500 }),
    drink({ id: 'd2', cost: 400 }),
    drink({ id: 'd3', cost: 600 }),
  ]
  const purchased = {
    d1: 24, // 24 × 500 = 12,000
    d2: 12, // 12 × 400 = 4,800
    d3: 36, // 36 × 600 = 21,600
  }
  // Total: 12,000 + 4,800 + 21,600 = 38,400
  const total = getTotalPurchaseCost(drinks, purchased)
  assert.equal(total, 38400)
})

test('getTotalPurchaseCost: some drinks with zero purchases', () => {
  const drinks = [
    drink({ id: 'd1', cost: 500 }),
    drink({ id: 'd2', cost: 400 }),
  ]
  const purchased = {
    d1: 24, // 24 × 500 = 12,000
    d2: 0,  // 0 × 400 = 0
  }
  const total = getTotalPurchaseCost(drinks, purchased)
  assert.equal(total, 12000)
})

test('getTotalExpenses: multiple expenses', () => {
  const expenses = [
    expense(5000),  // Salary
    expense(3000),  // Electricity
    expense(2000),  // Water
  ]
  // Total: 5,000 + 3,000 + 2,000 = 10,000
  const total = getTotalExpenses(expenses)
  assert.equal(total, 10000)
})

test('getTotalExpenses: zero expenses', () => {
  const total = getTotalExpenses([])
  assert.equal(total, 0)
})

test('getGrossProfit: positive profit', () => {
  // Revenue 19,100 - Purchase Cost 15,000 = Gross Profit 4,100
  const profit = getGrossProfit(19100, 15000)
  assert.equal(profit, 4100)
})

test('getGrossProfit: negative profit (loss)', () => {
  // Revenue 10,000 - Purchase Cost 15,000 = Gross Profit -5,000
  const profit = getGrossProfit(10000, 15000)
  assert.equal(profit, -5000)
})

test('getGrossProfit: zero profit (break even)', () => {
  // Revenue 15,000 - Purchase Cost 15,000 = Gross Profit 0
  const profit = getGrossProfit(15000, 15000)
  assert.equal(profit, 0)
})

test('getNetProfit: positive profit after expenses', () => {
  // Gross Profit 10,000 - Expenses 6,000 = Net Profit 4,000
  const profit = getNetProfit(10000, 6000)
  assert.equal(profit, 4000)
})

test('getNetProfit: negative profit (loss) after expenses', () => {
  // Gross Profit 5,000 - Expenses 8,000 = Net Profit -3,000
  const profit = getNetProfit(5000, 8000)
  assert.equal(profit, -3000)
})

test('getNetProfit: zero expenses', () => {
  // Gross Profit 10,000 - Expenses 0 = Net Profit 10,000
  const profit = getNetProfit(10000, 0)
  assert.equal(profit, 10000)
})

// ─── Integration Tests ───────────────────────────────────────────────────────

test('Full session calculation: profitable day', () => {
  // Setup: 2 drinks
  const drinks = [
    drink({ id: 'd1', name: 'Coca', price: 600, cost: 500, stock: 50 }),
    drink({ id: 'd2', name: 'Sprite', price: 600, cost: 450, stock: 40 }),
  ]

  // Purchases
  const purchased = {
    d1: 24, // Bought 24 Coca
    d2: 12, // Bought 12 Sprite
  }

  // Closing stock after sales
  const closing = {
    d1: 60, // Had 50+24=74, now 60 → sold 14
    d2: 45, // Had 40+12=52, now 45 → sold 7
  }

  // Calculate sold
  const sold = {
    d1: getSold(drinks[0].stock, purchased.d1, closing.d1), // 14
    d2: getSold(drinks[1].stock, purchased.d2, closing.d2), // 7
  }

  assert.equal(sold.d1, 14)
  assert.equal(sold.d2, 7)

  // Revenue: 14×600 + 7×600 = 12,600
  const revenue = getTotalRevenue(drinks, sold)
  assert.equal(revenue, 12600)

  // Purchase cost: 24×500 + 12×450 = 17,400
  const purchaseCost = getTotalPurchaseCost(drinks, purchased)
  assert.equal(purchaseCost, 17400)

  // Expenses
  const expenses = [expense(5000), expense(3000)]
  const totalExpenses = getTotalExpenses(expenses)
  assert.equal(totalExpenses, 8000)

  // Gross profit: 12,600 - 17,400 = -4,800 (loss)
  const grossProfit = getGrossProfit(revenue, purchaseCost)
  assert.equal(grossProfit, -4800)

  // Net profit: -4,800 - 8,000 = -12,800 (total loss)
  const netProfit = getNetProfit(grossProfit, totalExpenses)
  assert.equal(netProfit, -12800)
})

test('Full session calculation: profitable day with good margins', () => {
  const drinks = [
    drink({ id: 'd1', name: 'Coca', price: 600, cost: 400, stock: 100 }),
    drink({ id: 'd2', name: 'Sprite', price: 600, cost: 380, stock: 80 }),
  ]

  const purchased = {
    d1: 48, // Bought 48 Coca
    d2: 36, // Bought 36 Sprite
  }

  const closing = {
    d1: 98,  // Had 100+48=148, now 98 → sold 50
    d2: 76,  // Had 80+36=116, now 76 → sold 40
  }

  const sold = {
    d1: getSold(drinks[0].stock, purchased.d1, closing.d1), // 50
    d2: getSold(drinks[1].stock, purchased.d2, closing.d2), // 40
  }

  // Revenue: 50×600 + 40×600 = 54,000
  const revenue = getTotalRevenue(drinks, sold)
  assert.equal(revenue, 54000)

  // Purchase cost: 48×400 + 36×380 = 32,880
  const purchaseCost = getTotalPurchaseCost(drinks, purchased)
  assert.equal(purchaseCost, 32880)

  // Expenses
  const expenses = [expense(8000), expense(4000)]
  const totalExpenses = getTotalExpenses(expenses)
  assert.equal(totalExpenses, 12000)

  // Gross profit: 54,000 - 32,880 = 21,120
  const grossProfit = getGrossProfit(revenue, purchaseCost)
  assert.equal(grossProfit, 21120)

  // Net profit: 21,120 - 12,000 = 9,120
  const netProfit = getNetProfit(grossProfit, totalExpenses)
  assert.equal(netProfit, 9120)
})

test('Stock values: opening and closing', () => {
  const cost = 500

  // Opening: 50 units × 500 = 25,000 FCFA
  const openingValue = getOpeningStockValue(50, cost)
  assert.equal(openingValue, 25000)

  // Closing: 60 units × 500 = 30,000 FCFA
  const closingValue = getClosingStockValue(60, cost)
  assert.equal(closingValue, 30000)

  // Stock variance: closing - opening = 30,000 - 25,000 = 5,000 (increased)
  const variance = closingValue - openingValue
  assert.equal(variance, 5000)
})

test('Edge case: zero stock, zero purchases, zero sales', () => {
  const drinks = [drink({ id: 'd1', stock: 0 })]
  const purchased = { d1: 0 }
  const closing = { d1: 0 }
  const sold = { d1: getSold(0, 0, 0) }

  const revenue = getTotalRevenue(drinks, sold)
  const purchaseCost = getTotalPurchaseCost(drinks, purchased)
  const totalExpenses = getTotalExpenses([])
  const grossProfit = getGrossProfit(revenue, purchaseCost)
  const netProfit = getNetProfit(grossProfit, totalExpenses)

  assert.equal(sold.d1, 0)
  assert.equal(revenue, 0)
  assert.equal(purchaseCost, 0)
  assert.equal(totalExpenses, 0)
  assert.equal(grossProfit, 0)
  assert.equal(netProfit, 0)
})
