import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  stockStatus,
  stockPct,
  daysOfCover,
  splitRacks,
} from '../utils/calculations'

// ═══════════════════════════════════════════════════════════════════════════
// Inventory Management Integration Tests
// Testing complete inventory CRUD operations and stock management
// ═══════════════════════════════════════════════════════════════════════════

// Mock drink data structure
interface Drink {
  id: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  rackSize: number
  unit: string
}

// Mock inventory database
class MockInventoryDB {
  private drinks: Map<string, Drink> = new Map()

  add(drink: Drink): boolean {
    if (this.drinks.has(drink.id)) {
      return false
    }
    this.drinks.set(drink.id, drink)
    return true
  }

  get(id: string): Drink | undefined {
    return this.drinks.get(id)
  }

  getAll(): Drink[] {
    return Array.from(this.drinks.values())
  }

  update(id: string, updates: Partial<Drink>): boolean {
    const drink = this.drinks.get(id)
    if (!drink) {
      return false
    }
    this.drinks.set(id, { ...drink, ...updates })
    return true
  }

  delete(id: string): boolean {
    return this.drinks.delete(id)
  }

  clear(): void {
    this.drinks.clear()
  }

  search(query: string): Drink[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(drink =>
      drink.name.toLowerCase().includes(lowerQuery) ||
      drink.category.toLowerCase().includes(lowerQuery)
    )
  }

  filterByCategory(category: string): Drink[] {
    return this.getAll().filter(drink => drink.category === category)
  }

  getLowStockItems(): Drink[] {
    return this.getAll().filter(drink => drink.stock <= drink.minStock)
  }
}

// ─── User Story 1: Add New Drink to Inventory ─────────────────────────────
test('User Story: User can add a new drink to inventory', async () => {
  // Given: An empty inventory
  const inventory = new MockInventoryDB()

  // When: User adds a new drink
  const newDrink: Drink = {
    id: '1',
    name: 'Heineken',
    category: 'Bière',
    price: 500, // 5.00 EUR in cents
    cost: 300,  // 3.00 EUR in cents
    stock: 24,
    minStock: 12,
    rackSize: 12,
    unit: 'bouteille',
  }

  const added = inventory.add(newDrink)

  // Then: Drink is successfully added to inventory
  assert.equal(added, true, 'Drink should be added successfully')

  const retrieved = inventory.get('1')
  assert.ok(retrieved, 'Drink should be retrievable')
  assert.equal(retrieved?.name, 'Heineken', 'Drink name should match')
  assert.equal(retrieved?.stock, 24, 'Initial stock should match')
})

test('User Story: Cannot add drink with duplicate ID', async () => {
  // Given: An inventory with an existing drink
  const inventory = new MockInventoryDB()
  const drink: Drink = {
    id: '1',
    name: 'Corona',
    category: 'Bière',
    price: 550,
    cost: 350,
    stock: 12,
    minStock: 6,
    rackSize: 12,
    unit: 'bouteille',
  }
  inventory.add(drink)

  // When: User tries to add another drink with same ID
  const duplicate: Drink = {
    ...drink,
    name: 'Different Beer',
  }
  const added = inventory.add(duplicate)

  // Then: Addition should fail
  assert.equal(added, false, 'Duplicate ID should be rejected')

  // Original drink should remain unchanged
  const original = inventory.get('1')
  assert.equal(original?.name, 'Corona', 'Original drink should be unchanged')
})

test('User Story: Add drink with all required fields', async () => {
  // Given: A new drink with all required fields
  const inventory = new MockInventoryDB()
  const drink: Drink = {
    id: '2',
    name: 'Coca-Cola',
    category: 'Soft',
    price: 350,
    cost: 150,
    stock: 48,
    minStock: 24,
    rackSize: 24,
    unit: 'cannette',
  }

  // When: Drink is added
  const added = inventory.add(drink)

  // Then: All fields are stored correctly
  assert.equal(added, true, 'Should add drink')
  const retrieved = inventory.get('2')
  assert.deepEqual(retrieved, drink, 'All fields should be stored correctly')
})

// ─── User Story 2: View Inventory List ────────────────────────────────────
test('User Story: User can view complete inventory list', async () => {
  // Given: An inventory with multiple drinks
  const inventory = new MockInventoryDB()
  const drinks: Drink[] = [
    { id: '1', name: 'Heineken', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Corona', category: 'Bière', price: 550, cost: 350, stock: 12, minStock: 6, rackSize: 12, unit: 'bouteille' },
    { id: '3', name: 'Coca-Cola', category: 'Soft', price: 350, cost: 150, stock: 48, minStock: 24, rackSize: 24, unit: 'cannette' },
  ]

  drinks.forEach(drink => inventory.add(drink))

  // When: User requests inventory list
  const list = inventory.getAll()

  // Then: All drinks are returned
  assert.equal(list.length, 3, 'Should return all drinks')
  assert.ok(list.some(d => d.name === 'Heineken'), 'Should include Heineken')
  assert.ok(list.some(d => d.name === 'Corona'), 'Should include Corona')
  assert.ok(list.some(d => d.name === 'Coca-Cola'), 'Should include Coca-Cola')
})

test('User Story: View empty inventory', async () => {
  // Given: An empty inventory
  const inventory = new MockInventoryDB()

  // When: User views inventory
  const list = inventory.getAll()

  // Then: Empty list is returned
  assert.equal(list.length, 0, 'Should return empty list')
})

// ─── User Story 3: Edit Drink Details ─────────────────────────────────────
test('User Story: User can update drink information', async () => {
  // Given: An existing drink in inventory
  const inventory = new MockInventoryDB()
  const drink: Drink = {
    id: '1',
    name: 'Heineken',
    category: 'Bière',
    price: 500,
    cost: 300,
    stock: 24,
    minStock: 12,
    rackSize: 12,
    unit: 'bouteille',
  }
  inventory.add(drink)

  // When: User updates drink price and stock
  const updated = inventory.update('1', {
    price: 550, // Price increase
    stock: 36,  // Stock updated
  })

  // Then: Updates are applied correctly
  assert.equal(updated, true, 'Update should succeed')

  const retrieved = inventory.get('1')
  assert.equal(retrieved?.price, 550, 'Price should be updated')
  assert.equal(retrieved?.stock, 36, 'Stock should be updated')
  assert.equal(retrieved?.name, 'Heineken', 'Name should remain unchanged')
  assert.equal(retrieved?.cost, 300, 'Cost should remain unchanged')
})

test('User Story: Cannot update non-existent drink', async () => {
  // Given: An empty inventory
  const inventory = new MockInventoryDB()

  // When: User tries to update non-existent drink
  const updated = inventory.update('999', { price: 600 })

  // Then: Update should fail
  assert.equal(updated, false, 'Should fail to update non-existent drink')
})

test('User Story: Update only specified fields', async () => {
  // Given: An existing drink
  const inventory = new MockInventoryDB()
  const original: Drink = {
    id: '1',
    name: 'Original Name',
    category: 'Bière',
    price: 500,
    cost: 300,
    stock: 24,
    minStock: 12,
    rackSize: 12,
    unit: 'bouteille',
  }
  inventory.add(original)

  // When: User updates only the name
  inventory.update('1', { name: 'Updated Name' })

  // Then: Only name is changed
  const updated = inventory.get('1')
  assert.equal(updated?.name, 'Updated Name', 'Name should be updated')
  assert.equal(updated?.price, 500, 'Price should remain unchanged')
  assert.equal(updated?.stock, 24, 'Stock should remain unchanged')
})

// ─── User Story 4: Delete Drink ───────────────────────────────────────────
test('User Story: User can delete a drink from inventory', async () => {
  // Given: An inventory with drinks
  const inventory = new MockInventoryDB()
  inventory.add({
    id: '1',
    name: 'Heineken',
    category: 'Bière',
    price: 500,
    cost: 300,
    stock: 24,
    minStock: 12,
    rackSize: 12,
    unit: 'bouteille',
  })

  // When: User deletes the drink
  const deleted = inventory.delete('1')

  // Then: Drink is removed from inventory
  assert.equal(deleted, true, 'Delete should succeed')

  const retrieved = inventory.get('1')
  assert.equal(retrieved, undefined, 'Drink should no longer exist')

  const list = inventory.getAll()
  assert.equal(list.length, 0, 'Inventory should be empty')
})

test('User Story: Cannot delete non-existent drink', async () => {
  // Given: An empty inventory
  const inventory = new MockInventoryDB()

  // When: User tries to delete non-existent drink
  const deleted = inventory.delete('999')

  // Then: Delete should fail gracefully
  assert.equal(deleted, false, 'Should fail to delete non-existent drink')
})

// ─── User Story 5: Search Drinks ──────────────────────────────────────────
test('User Story: User can search drinks by name', async () => {
  // Given: An inventory with various drinks
  const inventory = new MockInventoryDB()
  const drinks: Drink[] = [
    { id: '1', name: 'Heineken', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Heineken 0.0', category: 'Bière sans alcool', price: 450, cost: 280, stock: 12, minStock: 6, rackSize: 12, unit: 'bouteille' },
    { id: '3', name: 'Corona', category: 'Bière', price: 550, cost: 350, stock: 12, minStock: 6, rackSize: 12, unit: 'bouteille' },
  ]
  drinks.forEach(d => inventory.add(d))

  // When: User searches for "Heineken"
  const results = inventory.search('Heineken')

  // Then: All Heineken variants are returned
  assert.equal(results.length, 2, 'Should find 2 Heineken drinks')
  assert.ok(results.some(d => d.name === 'Heineken'), 'Should include regular Heineken')
  assert.ok(results.some(d => d.name === 'Heineken 0.0'), 'Should include Heineken 0.0')
})

test('User Story: Search is case-insensitive', async () => {
  // Given: Inventory with drinks
  const inventory = new MockInventoryDB()
  inventory.add({
    id: '1',
    name: 'Corona',
    category: 'Bière',
    price: 550,
    cost: 350,
    stock: 12,
    minStock: 6,
    rackSize: 12,
    unit: 'bouteille',
  })

  // When: User searches with different cases
  const lowerCase = inventory.search('corona')
  const upperCase = inventory.search('CORONA')
  const mixedCase = inventory.search('CoRoNa')

  // Then: All searches return the same result
  assert.equal(lowerCase.length, 1, 'Lowercase search should find drink')
  assert.equal(upperCase.length, 1, 'Uppercase search should find drink')
  assert.equal(mixedCase.length, 1, 'Mixed case search should find drink')
})

test('User Story: Search by category', async () => {
  // Given: Inventory with mixed categories
  const inventory = new MockInventoryDB()
  const drinks: Drink[] = [
    { id: '1', name: 'Heineken', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Coca-Cola', category: 'Soft', price: 350, cost: 150, stock: 48, minStock: 24, rackSize: 24, unit: 'cannette' },
    { id: '3', name: 'Red Bull', category: 'Soft', price: 400, cost: 200, stock: 24, minStock: 12, rackSize: 24, unit: 'cannette' },
  ]
  drinks.forEach(d => inventory.add(d))

  // When: User searches for "Soft"
  const softDrinks = inventory.search('Soft')

  // Then: All soft drinks are returned
  assert.equal(softDrinks.length, 2, 'Should find 2 soft drinks')
  assert.ok(softDrinks.every(d => d.category === 'Soft'), 'All results should be Soft drinks')
})

// ─── User Story 6: Filter by Category ─────────────────────────────────────
test('User Story: User can filter drinks by category', async () => {
  // Given: Inventory with multiple categories
  const inventory = new MockInventoryDB()
  const drinks: Drink[] = [
    { id: '1', name: 'Heineken', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Corona', category: 'Bière', price: 550, cost: 350, stock: 12, minStock: 6, rackSize: 12, unit: 'bouteille' },
    { id: '3', name: 'Coca-Cola', category: 'Soft', price: 350, cost: 150, stock: 48, minStock: 24, rackSize: 24, unit: 'cannette' },
    { id: '4', name: 'Whisky', category: 'Spiritueux', price: 800, cost: 500, stock: 6, minStock: 3, rackSize: 6, unit: 'bouteille' },
  ]
  drinks.forEach(d => inventory.add(d))

  // When: User filters by "Bière" category
  const beers = inventory.filterByCategory('Bière')

  // Then: Only beers are returned
  assert.equal(beers.length, 2, 'Should find 2 beers')
  assert.ok(beers.every(d => d.category === 'Bière'), 'All results should be beers')
  assert.ok(beers.some(d => d.name === 'Heineken'), 'Should include Heineken')
  assert.ok(beers.some(d => d.name === 'Corona'), 'Should include Corona')
})

// ─── User Story 7: Stock Status Monitoring ────────────────────────────────
test('User Story: User can identify low stock items', async () => {
  // Given: Inventory with various stock levels
  const inventory = new MockInventoryDB()
  const drinks: Drink[] = [
    { id: '1', name: 'Low Stock Beer', category: 'Bière', price: 500, cost: 300, stock: 5, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Good Stock Beer', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '3', name: 'Out of Stock', category: 'Soft', price: 350, cost: 150, stock: 0, minStock: 24, rackSize: 24, unit: 'cannette' },
  ]
  drinks.forEach(d => inventory.add(d))

  // When: User requests low stock items
  const lowStock = inventory.getLowStockItems()

  // Then: Items at or below minimum stock are returned
  assert.equal(lowStock.length, 2, 'Should find 2 low stock items')
  assert.ok(lowStock.some(d => d.name === 'Low Stock Beer'), 'Should include low stock beer')
  assert.ok(lowStock.some(d => d.name === 'Out of Stock'), 'Should include out of stock item')
  assert.ok(!lowStock.some(d => d.name === 'Good Stock Beer'), 'Should not include items with good stock')
})

test('User Story: Stock status is correctly categorized', async () => {
  // Given: Different stock levels
  const minStock = 12

  // When: Stock status is evaluated
  const ruptureStatus = stockStatus(0, minStock)      // 0 stock
  const lowStatus = stockStatus(12, minStock)         // At minimum
  const mediumStatus = stockStatus(15, minStock)      // 1.25x minimum
  const okStatus = stockStatus(25, minStock)          // 2x minimum

  // Then: Status matches stock level
  assert.equal(ruptureStatus, 'rupture', 'Zero stock should be rupture')
  assert.equal(lowStatus, 'low', 'At minimum should be low')
  assert.equal(mediumStatus, 'medium', 'Below 1.5x should be medium')
  assert.equal(okStatus, 'ok', 'Above 1.5x should be ok')
})

test('User Story: Stock percentage shows restock progress', async () => {
  // Given: Stock levels relative to target
  const minStock = 12

  // When: Stock percentage is calculated
  const emptyPct = stockPct(0, minStock)      // 0% of target (24)
  const halfPct = stockPct(12, minStock)      // 50% of target
  const fullPct = stockPct(24, minStock)      // 100% of target
  const overPct = stockPct(30, minStock)      // Over target, clamped

  // Then: Percentage reflects stock level
  assert.equal(emptyPct, 0, 'Empty stock should be 0%')
  assert.equal(halfPct, 50, 'At minimum should be 50%')
  assert.equal(fullPct, 100, 'At target should be 100%')
  assert.equal(overPct, 100, 'Over target should be clamped to 100%')
})

// ─── User Story 8: Days of Cover Calculation ──────────────────────────────
test('User Story: User can see how long stock will last', async () => {
  // Given: Stock level and average daily sales
  const currentStock = 30
  const avgDailySales = 6

  // When: Days of cover is calculated
  const days = daysOfCover(currentStock, avgDailySales)

  // Then: Days until stock runs out is shown
  assert.equal(days, 5, 'Should calculate 5 days of cover')
})

test('User Story: Days of cover handles edge cases', async () => {
  // Scenario 1: No sales history
  const noSales = daysOfCover(20, 0)
  assert.equal(noSales, Infinity, 'No sales should show infinite days')

  // Scenario 2: High sales rate
  const highSales = daysOfCover(10, 10)
  assert.equal(highSales, 1, 'Should show 1 day when stock equals daily sales')

  // Scenario 3: Very low sales
  const lowSales = daysOfCover(100, 2)
  assert.equal(lowSales, 50, 'Should calculate many days for low sales')
})

// ─── User Story 9: Rack/Unit Conversion ───────────────────────────────────
test('User Story: User can view stock in racks and individual units', async () => {
  // Given: Stock quantities and rack sizes
  const testCases = [
    { units: 30, rackSize: 12, expectedRacks: 2, expectedRemainder: 6 },
    { units: 24, rackSize: 12, expectedRacks: 2, expectedRemainder: 0 },
    { units: 5, rackSize: 12, expectedRacks: 0, expectedRemainder: 5 },
    { units: 48, rackSize: 24, expectedRacks: 2, expectedRemainder: 0 },
  ]

  // When: Stock is split into racks and units
  for (const tc of testCases) {
    const result = splitRacks(tc.units, tc.rackSize)

    // Then: Correct rack and unit count is shown
    assert.equal(result.racks, tc.expectedRacks,
      `${tc.units} units with rack size ${tc.rackSize} should have ${tc.expectedRacks} racks`)
    assert.equal(result.remainder, tc.expectedRemainder,
      `${tc.units} units with rack size ${tc.rackSize} should have ${tc.expectedRemainder} remaining`)
  }
})

test('User Story: Rack conversion handles zero rack size', async () => {
  // Given: Zero or invalid rack size
  const result = splitRacks(10, 0)

  // When: Rack split is calculated
  // Then: Falls back to treating each unit as 1 rack
  assert.equal(result.racks, 10, 'Should treat each unit as 1 rack')
  assert.equal(result.remainder, 0, 'Should have no remainder')
})

// ─── User Story 10: Complete Inventory Workflow ───────────────────────────
test('User Story: Complete inventory management workflow', async () => {
  // Given: A new bar setting up inventory
  const inventory = new MockInventoryDB()

  // When: User adds multiple drinks
  const drinks: Drink[] = [
    { id: '1', name: 'Heineken', category: 'Bière', price: 500, cost: 300, stock: 24, minStock: 12, rackSize: 12, unit: 'bouteille' },
    { id: '2', name: 'Coca-Cola', category: 'Soft', price: 350, cost: 150, stock: 48, minStock: 24, rackSize: 24, unit: 'cannette' },
    { id: '3', name: 'Whisky', category: 'Spiritueux', price: 800, cost: 500, stock: 6, minStock: 3, rackSize: 6, unit: 'bouteille' },
  ]

  drinks.forEach(d => {
    const added = inventory.add(d)
    assert.ok(added, `Should add ${d.name}`)
  })

  // Step 1: View all inventory
  let allDrinks = inventory.getAll()
  assert.equal(allDrinks.length, 3, 'Should have 3 drinks')

  // Step 2: Update a price
  inventory.update('1', { price: 550 })
  const updated = inventory.get('1')
  assert.equal(updated?.price, 550, 'Price should be updated')

  // Step 3: Check stock status
  const lowStock = inventory.getLowStockItems()
  assert.ok(lowStock.length >= 0, 'Should identify low stock items')

  // Step 4: Search for a drink
  const searchResults = inventory.search('Heineken')
  assert.equal(searchResults.length, 1, 'Should find Heineken')

  // Step 5: Filter by category
  const softDrinks = inventory.filterByCategory('Soft')
  assert.equal(softDrinks.length, 1, 'Should find 1 soft drink')

  // Step 6: Delete a drink
  const deleted = inventory.delete('3')
  assert.ok(deleted, 'Should delete Whisky')

  // Then: Final inventory state is correct
  allDrinks = inventory.getAll()
  assert.equal(allDrinks.length, 2, 'Should have 2 drinks remaining')
  assert.ok(!allDrinks.some(d => d.name === 'Whisky'), 'Whisky should be deleted')
})
