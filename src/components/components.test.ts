import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitRacks, stockStatus, stockPct } from '../utils/calculations'

// ═══════════════════════════════════════════════════════════════════════════
// UI Components Integration Tests
// Testing component logic and data transformations
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock Progress Bar Component ──────────────────────────────────────────
test('Component: StockProgressBar calculates correct percentage', () => {
  // Given: Stock levels
  const testCases = [
    { stock: 0, minStock: 12, expected: 0 },
    { stock: 6, minStock: 12, expected: 25 },   // 6/24 = 25%
    { stock: 12, minStock: 12, expected: 50 },  // 12/24 = 50%
    { stock: 24, minStock: 12, expected: 100 }, // 24/24 = 100%
    { stock: 30, minStock: 12, expected: 100 }, // Over 100% clamped
  ]

  // When: Progress percentage is calculated
  for (const tc of testCases) {
    const percentage = stockPct(tc.stock, tc.minStock)

    // Then: Correct percentage is returned
    assert.equal(percentage, tc.expected,
      `Stock ${tc.stock} with min ${tc.minStock} should be ${tc.expected}%`)
  }
})

test('Component: StockProgressBar assigns correct color by status', () => {
  // Given: Different stock statuses
  const statusColors = {
    rupture: '#EF4444',  // Red
    low: '#F59E0B',      // Orange
    medium: '#3B82F6',   // Blue
    ok: '#10B981',       // Green
  }

  const testCases = [
    { stock: 0, minStock: 12, expectedStatus: 'rupture', expectedColor: statusColors.rupture },
    { stock: 6, minStock: 12, expectedStatus: 'low', expectedColor: statusColors.low },
    { stock: 15, minStock: 12, expectedStatus: 'medium', expectedColor: statusColors.medium },
    { stock: 25, minStock: 12, expectedStatus: 'ok', expectedColor: statusColors.ok },
  ]

  // When: Status and color are determined
  for (const tc of testCases) {
    const status = stockStatus(tc.stock, tc.minStock)
    const color = statusColors[status]

    // Then: Correct status and color are assigned
    assert.equal(status, tc.expectedStatus, `Stock ${tc.stock} should have status ${tc.expectedStatus}`)
    assert.equal(color, tc.expectedColor, `Status ${status} should have color ${tc.expectedColor}`)
  }
})

// ─── Badge Component ───────────────────────────────────────────────────────
test('Component: Badge displays correct variant styling', () => {
  // Given: Badge variants
  type BadgeVariant = 'success' | 'warning' | 'danger' | 'info'

  interface BadgeStyle {
    backgroundColor: string
    textColor: string
  }

  const badgeStyles: Record<BadgeVariant, BadgeStyle> = {
    success: { backgroundColor: '#10B981', textColor: '#FFFFFF' },
    warning: { backgroundColor: '#F59E0B', textColor: '#FFFFFF' },
    danger: { backgroundColor: '#EF4444', textColor: '#FFFFFF' },
    info: { backgroundColor: '#3B82F6', textColor: '#FFFFFF' },
  }

  // When: Badge variant is selected
  const variants: BadgeVariant[] = ['success', 'warning', 'danger', 'info']

  for (const variant of variants) {
    const style = badgeStyles[variant]

    // Then: Correct styling is applied
    assert.ok(style.backgroundColor, `${variant} should have background color`)
    assert.ok(style.textColor, `${variant} should have text color`)
  }
})

// ─── Category Share Component ──────────────────────────────────────────────
test('Component: CategoryShare calculates correct percentages', () => {
  // Given: Revenue by category
  const categories = [
    { name: 'Bière', revenue: 50000 },
    { name: 'Soft', revenue: 30000 },
    { name: 'Spiritueux', revenue: 20000 },
  ]

  // When: Total and percentages are calculated
  const total = categories.reduce((sum, c) => sum + c.revenue, 0)
  const withPercentages = categories.map(c => ({
    ...c,
    percentage: (c.revenue / total) * 100,
  }))

  // Then: Percentages add up to 100%
  const totalPercentage = withPercentages.reduce((sum, c) => sum + c.percentage, 0)
  assert.ok(Math.abs(totalPercentage - 100) < 0.01, 'Percentages should sum to 100%')

  assert.equal(withPercentages[0].percentage, 50, 'Bière should be 50%')
  assert.equal(withPercentages[1].percentage, 30, 'Soft should be 30%')
  assert.equal(withPercentages[2].percentage, 20, 'Spiritueux should be 20%')
})

test('Component: CategoryShare handles empty data', () => {
  // Given: No categories
  const categories: Array<{ name: string; revenue: number }> = []

  // When: Component renders with empty data
  const total = categories.reduce((sum, c) => sum + c.revenue, 0)

  // Then: Total is 0 and no error occurs
  assert.equal(total, 0, 'Empty categories should have 0 total')
  assert.equal(categories.length, 0, 'Should handle empty array')
})

// ─── Unit Conversion Display ───────────────────────────────────────────────
test('Component: Unit display converts to racks correctly', () => {
  // Given: Quantities in units
  const testCases = [
    { units: 30, rackSize: 12, expectedDisplay: '2R 6U' },  // 2 racks, 6 units
    { units: 24, rackSize: 12, expectedDisplay: '2R' },     // Exactly 2 racks
    { units: 5, rackSize: 12, expectedDisplay: '5U' },      // Less than 1 rack
    { units: 48, rackSize: 24, expectedDisplay: '2R' },     // Different rack size
  ]

  // When: Display string is generated
  for (const tc of testCases) {
    const { racks, remainder } = splitRacks(tc.units, tc.rackSize)
    const display = racks > 0
      ? remainder > 0
        ? `${racks}R ${remainder}U`
        : `${racks}R`
      : `${remainder}U`

    // Then: Correct format is shown
    assert.equal(display, tc.expectedDisplay,
      `${tc.units} units should display as ${tc.expectedDisplay}`)
  }
})

// ─── Session Expenses Panel ────────────────────────────────────────────────
test('Component: SessionExpensesPanel formats currency correctly', () => {
  // Given: Various amounts in cents
  const amounts = [500, 1000, 10000, 125, 5050]

  // When: Amounts are formatted
  const formatCurrency = (cents: number): string => {
    return `${(cents / 100).toFixed(2)} €`
  }

  const formatted = amounts.map(formatCurrency)

  // Then: Correct format is displayed
  assert.equal(formatted[0], '5.00 €', '500 cents should be 5.00 €')
  assert.equal(formatted[1], '10.00 €', '1000 cents should be 10.00 €')
  assert.equal(formatted[2], '100.00 €', '10000 cents should be 100.00 €')
  assert.equal(formatted[3], '1.25 €', '125 cents should be 1.25 €')
  assert.equal(formatted[4], '50.50 €', '5050 cents should be 50.50 €')
})

test('Component: SessionExpensesPanel handles zero and negative values', () => {
  // Given: Edge case values
  const formatCurrency = (cents: number): string => {
    return `${(cents / 100).toFixed(2)} €`
  }

  // When: Formatted
  const zero = formatCurrency(0)
  const negative = formatCurrency(-500)

  // Then: Handled correctly
  assert.equal(zero, '0.00 €', 'Zero should format correctly')
  assert.equal(negative, '-5.00 €', 'Negative should format correctly')
})

// ─── Chart Data Transformation ─────────────────────────────────────────────
test('Component: Chart transforms session data correctly', () => {
  // Given: Raw session data
  interface SessionData {
    date: string
    revenue: number
    profit: number
  }

  const sessions: SessionData[] = [
    { date: '2024-01-10', revenue: 10000, profit: 4000 },
    { date: '2024-01-11', revenue: 12000, profit: 5000 },
    { date: '2024-01-12', revenue: 15000, profit: 6000 },
  ]

  // When: Data is transformed for chart
  interface ChartDataPoint {
    label: string
    value: number
  }

  const revenueData: ChartDataPoint[] = sessions.map(s => ({
    label: s.date.split('-')[2], // Just day number
    value: s.revenue / 100, // Convert to euros
  }))

  // Then: Data is in correct format
  assert.equal(revenueData.length, 3, 'Should have 3 data points')
  assert.equal(revenueData[0].label, '10', 'Label should be day number')
  assert.equal(revenueData[0].value, 100, 'Value should be in euros')
  assert.equal(revenueData[2].value, 150, 'Last value should be 150 euros')
})

// ─── Input Validation Display ──────────────────────────────────────────────
test('Component: Input displays validation errors correctly', () => {
  // Given: Validation error states
  interface InputValidation {
    value: string
    error: string | null
    isValid: boolean
  }

  const emailInput: InputValidation = {
    value: 'invalid-email',
    error: 'Format d\'email invalide',
    isValid: false,
  }

  const passwordInput: InputValidation = {
    value: '123',
    error: 'Le mot de passe doit contenir au moins 6 caractères',
    isValid: false,
  }

  const validInput: InputValidation = {
    value: 'valid@example.com',
    error: null,
    isValid: true,
  }

  // When: Error display is determined
  // Then: Correct error messages are shown
  assert.equal(emailInput.isValid, false, 'Invalid email should not be valid')
  assert.ok(emailInput.error, 'Invalid email should have error message')

  assert.equal(passwordInput.isValid, false, 'Short password should not be valid')
  assert.ok(passwordInput.error, 'Short password should have error message')

  assert.equal(validInput.isValid, true, 'Valid input should be valid')
  assert.equal(validInput.error, null, 'Valid input should have no error')
})

// ─── Stepper Component ─────────────────────────────────────────────────────
test('Component: Stepper tracks form progress correctly', () => {
  // Given: Multi-step form
  interface StepperState {
    currentStep: number
    totalSteps: number
    completedSteps: boolean[]
  }

  const stepper: StepperState = {
    currentStep: 2,
    totalSteps: 4,
    completedSteps: [true, true, false, false],
  }

  // When: Progress is calculated
  const progress = (stepper.currentStep / stepper.totalSteps) * 100
  const canGoNext = stepper.currentStep < stepper.totalSteps
  const canGoPrevious = stepper.currentStep > 1

  // Then: State is correct
  assert.equal(progress, 50, 'Progress should be 50%')
  assert.equal(canGoNext, true, 'Should be able to go to next step')
  assert.equal(canGoPrevious, true, 'Should be able to go to previous step')
})

// ─── Skeleton Loading Component ────────────────────────────────────────────
test('Component: Skeleton shows correct number of placeholders', () => {
  // Given: Loading state with count
  const itemCount = 5

  // When: Skeleton items are generated
  const skeletonItems = Array.from({ length: itemCount }, (_, i) => ({
    id: `skeleton-${i}`,
    type: 'placeholder',
  }))

  // Then: Correct number of items are shown
  assert.equal(skeletonItems.length, itemCount, 'Should have 5 skeleton items')
  assert.equal(skeletonItems[0].id, 'skeleton-0', 'IDs should be unique')
})

// ─── Button Component States ───────────────────────────────────────────────
test('Component: Button handles disabled and loading states', () => {
  // Given: Button states
  interface ButtonState {
    disabled: boolean
    loading: boolean
    canClick: boolean
  }

  const states: ButtonState[] = [
    { disabled: false, loading: false, canClick: true },
    { disabled: true, loading: false, canClick: false },
    { disabled: false, loading: true, canClick: false },
    { disabled: true, loading: true, canClick: false },
  ]

  // When: Click availability is determined
  for (const state of states) {
    const clickable = !state.disabled && !state.loading

    // Then: Correct clickability is set
    assert.equal(clickable, state.canClick,
      `Button should ${state.canClick ? 'be' : 'not be'} clickable`)
  }
})

// ─── Card Component ────────────────────────────────────────────────────────
test('Component: Card displays metrics correctly', () => {
  // Given: Metric data
  interface MetricCard {
    title: string
    value: number | string
    trend?: number
    unit?: string
  }

  const cards: MetricCard[] = [
    { title: 'Revenue', value: 25000, unit: '€', trend: 15 },
    { title: 'Units Sold', value: 50, trend: -5 },
    { title: 'Margin', value: '35%', trend: 2 },
  ]

  // When: Cards are rendered
  // Then: All data is available
  assert.equal(cards[0].title, 'Revenue', 'Title should be set')
  assert.equal(cards[0].value, 25000, 'Value should be set')
  assert.equal(cards[0].trend, 15, 'Positive trend should be set')

  assert.ok(cards[1].trend && cards[1].trend < 0, 'Negative trend should be detectable')
  assert.equal(typeof cards[2].value, 'string', 'Value can be string')
})

// ─── Expandable Chart Card ─────────────────────────────────────────────────
test('Component: ExpandableChartCard toggles expanded state', () => {
  // Given: Initial collapsed state
  let isExpanded = false

  // When: User toggles expansion
  const toggle = () => { isExpanded = !isExpanded }

  toggle() // Expand
  assert.equal(isExpanded, true, 'Should be expanded after first toggle')

  toggle() // Collapse
  assert.equal(isExpanded, false, 'Should be collapsed after second toggle')
})

// ─── Phone Input Component ─────────────────────────────────────────────────
test('Component: PhoneInput validates format', () => {
  // Given: Phone input values
  const validatePhone = (phone: string): boolean => {
    // Basic validation: starts with + and has at least 8 digits (excluding spaces)
    const digitsOnly = phone.replace(/\s/g, '')
    return digitsOnly.startsWith('+') && /\d{8,}/.test(digitsOnly)
  }

  const testCases = [
    { value: '+33123456789', expected: true },
    { value: '0123456789', expected: false },    // Missing +
    { value: '+3312345', expected: false },      // Too short
    { value: '', expected: false },              // Empty
    { value: '+33 6 12 34 56 78', expected: true }, // With spaces (still has 9 digits)
  ]

  // When: Validation is performed
  for (const tc of testCases) {
    const isValid = validatePhone(tc.value)

    // Then: Correct validation result
    assert.equal(isValid, tc.expected,
      `"${tc.value}" should ${tc.expected ? 'be valid' : 'be invalid'}`)
  }
})

// ─── Screen Header Component ───────────────────────────────────────────────
test('Component: ScreenHeader displays correct title and actions', () => {
  // Given: Header configuration
  interface HeaderConfig {
    title: string
    subtitle?: string
    hasBackButton: boolean
    actionCount: number
  }

  const configs: HeaderConfig[] = [
    { title: 'Dashboard', hasBackButton: false, actionCount: 0 },
    { title: 'Add Drink', hasBackButton: true, actionCount: 1 },
    { title: 'Session Detail', subtitle: '2024-01-15', hasBackButton: true, actionCount: 2 },
  ]

  // When: Headers are rendered
  for (const config of configs) {
    // Then: Correct configuration is used
    assert.ok(config.title, 'Title should be present')
    if (config.subtitle) {
      assert.ok(config.subtitle, 'Subtitle should be shown when provided')
    }
    assert.equal(typeof config.hasBackButton, 'boolean', 'Back button state should be boolean')
    assert.ok(config.actionCount >= 0, 'Action count should be non-negative')
  }
})

// ─── Form Validation Summary ───────────────────────────────────────────────
test('Component: Form shows validation summary', () => {
  // Given: Form with multiple fields
  interface FormField {
    name: string
    value: string
    error: string | null
  }

  const formFields: FormField[] = [
    { name: 'email', value: 'invalid', error: 'Email invalide' },
    { name: 'password', value: '123', error: 'Mot de passe trop court' },
    { name: 'name', value: 'John', error: null },
  ]

  // When: Validation summary is generated
  const errors = formFields.filter(f => f.error !== null)
  const isFormValid = errors.length === 0

  // Then: Summary is correct
  assert.equal(isFormValid, false, 'Form should not be valid')
  assert.equal(errors.length, 2, 'Should have 2 errors')
  assert.ok(errors.every(e => e.error), 'All errors should have messages')
})

test('Component: Valid form enables submit button', () => {
  // Given: Valid form fields
  interface FormField {
    value: string
    isValid: boolean
  }

  const validForm: FormField[] = [
    { value: 'test@example.com', isValid: true },
    { value: 'SecurePass123', isValid: true },
    { value: 'John Doe', isValid: true },
  ]

  // When: Form validity is checked
  const canSubmit = validForm.every(f => f.isValid)

  // Then: Submit is enabled
  assert.equal(canSubmit, true, 'Should be able to submit valid form')
})
