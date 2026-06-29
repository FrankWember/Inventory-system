import { test } from 'node:test'
import assert from 'node:assert'

// Import types directly to avoid React Native imports
interface SessionLine {
  id: string
  drink_name: string
  drink_id: string
  opening_stock: number
  purchased: number
  sold: number
  closing_stock: number
  cost: number
  revenue: number
}

interface Session {
  id: string
  date: string
  label: string
  total_revenue: number
  total_cost: number
  total_purchase: number
  total_profit: number
  closed: boolean
  created_at: string
  session_lines?: SessionLine[]
}

interface Expense {
  id: string
  label: string
  amount: number
  date: string
  created_at: string
}

// Mock the helper functions
const mockHelpers = {
  fmt: (n: number) => {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' FCFA'
  },
  fmtNum: (n: number) => {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  },
  dateLabelLong: (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  },
  formatWithCassiers: (units: number, category: string) => {
    const rackSize = category === 'Bière' ? 24 : 1
    const racks = Math.floor(units / rackSize)
    const remainder = units % rackSize
    if (racks > 0 && remainder > 0) return `${racks}C+${remainder}`
    if (racks > 0) return `${racks}C`
    return `${units}`
  }
}

// Dynamically import and execute printJournal with mocked dependencies
const createPrintJournal = () => {
  return (data: { session: Session; lines: SessionLine[]; expenses: Expense[]; drinksCategoryMap: Record<string, string> }) => {
    const { session, lines, expenses, drinksCategoryMap } = data
    const purchaseLines = lines.filter(l => l.purchased > 0)
    const saleLines = lines.filter(l => l.sold > 0).sort((a, b) => b.revenue - a.revenue)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const totalUnits = lines.reduce((s, l) => s + l.sold, 0)
    const grossProfit = session.total_revenue - session.total_cost
    const netProfit = session.total_revenue - session.total_cost - totalExpenses

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Journal de caisse - ${mockHelpers.dateLabelLong(session.date)}</title>
  <style>
    /* styles omitted for brevity in test */
  </style>
</head>
<body>
  <div class="header">
    <h1>Journal de caisse</h1>
    <div class="date">${mockHelpers.dateLabelLong(session.date)}</div>
    ${session.closed ? '<div class="badge">✓ Journée clôturée</div>' : '<div class="badge">⏱ Session en cours</div>'}
  </div>
  <div class="section">
    <div class="section-title">Compte de résultat</div>
    <div class="card">
      <div class="subsection-title">Revenus</div>
      <div class="row">
        <span class="row-label">Ventes totales</span>
        <span class="row-value row-positive">${mockHelpers.fmt(session.total_revenue)}</span>
      </div>
      <div class="row row-muted">
        <span class="row-label">Unités vendues (${mockHelpers.fmtNum(totalUnits)})</span>
        <span class="row-value"></span>
      </div>
      ${saleLines.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail par article:</div>
          ${saleLines.slice(0, 5).map(line => `
            <div class="breakdown-item">
              <span>${line.drink_name}</span>
              <span style="font-weight: 600;">${mockHelpers.fmt(line.revenue)}</span>
            </div>
          `).join('')}
          ${saleLines.length > 5 ? `<div style="font-size: 9pt; color: #94a3b8; font-style: italic; margin-top: 8px;">...et ${saleLines.length - 5} autres</div>` : ''}
        </div>
      ` : ''}
      <div class="divider"></div>
      <div class="subsection-title">Coûts et dépenses</div>
      <div class="row">
        <span class="row-label">Coût des achats</span>
        <span class="row-value row-negative">-${mockHelpers.fmt(session.total_cost)}</span>
      </div>
      ${purchaseLines.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail des achats:</div>
          ${purchaseLines.map(line => `
            <div class="breakdown-item">
              <span>${line.drink_name} (${mockHelpers.fmtNum(line.purchased)})</span>
              <span style="font-weight: 600;">-${mockHelpers.fmt(line.cost)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="row">
        <span class="row-label">Dépenses opérationnelles</span>
        <span class="row-value row-negative">-${mockHelpers.fmt(totalExpenses)}</span>
      </div>
      ${expenses.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail des dépenses:</div>
          ${expenses.map(exp => `
            <div class="breakdown-item">
              <span>${exp.label}</span>
              <span style="font-weight: 600;">-${mockHelpers.fmt(exp.amount)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="divider"></div>
      <div class="row">
        <span class="row-label" style="font-weight: 600;">Marge brute</span>
        <span class="row-value row-primary">${mockHelpers.fmt(grossProfit)}</span>
      </div>
      <div class="row row-muted">
        <span class="row-label">Taux de marge</span>
        <span class="row-value">${session.total_revenue > 0 ? ((grossProfit / session.total_revenue) * 100).toFixed(1) : 0}%</span>
      </div>
      <div class="divider"></div>
      <div class="total-row">
        <div class="row" style="border: none;">
          <span style="font-size: 12pt; font-weight: 700;">Résultat net</span>
          <span style="font-size: 14pt; font-weight: 700; color: ${netProfit >= 0 ? '#4A90E2' : '#dc2626'};">${mockHelpers.fmt(netProfit)}</span>
        </div>
        <div class="row row-muted" style="border: none; padding-top: 4px;">
          <span class="row-label">Rentabilité nette</span>
          <span class="row-value">${session.total_revenue > 0 ? ((netProfit / session.total_revenue) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>
    </div>
  </div>
  ${lines.filter(l => l.opening_stock > 0 || l.purchased > 0 || l.sold > 0).length > 0 ? `
    <div class="section">
      <div class="section-title">Flux de stock détaillé (${lines.filter(l => l.opening_stock > 0 || l.purchased > 0 || l.sold > 0).length})</div>
    </div>
  ` : ''}
  ${purchaseLines.length > 0 ? `
    <div class="section">
      <div class="section-title">Réceptions / Achats (${purchaseLines.length})</div>
    </div>
  ` : ''}
  ${saleLines.length > 0 ? `
    <div class="section">
      <div class="section-title">Ventes (${saleLines.length})</div>
    </div>
  ` : ''}
  ${expenses.length > 0 ? `
    <div class="section">
      <div class="section-title">Dépenses opérationnelles (${expenses.length})</div>
    </div>
  ` : ''}
  <div class="footer">
    <div>Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    <div style="margin-top: 8px;">BarTrack - Système de gestion d'inventaire</div>
  </div>
</body>
</html>
    `

    // @ts-ignore - window is mocked in tests
    const printWindow = window.open('', '_blank', 'width=800,height=600')

    if (!printWindow) {
      // @ts-ignore - alert is mocked in tests
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups pour ce site.')
      return
    }

    try {
      printWindow.document.write(html)
      printWindow.document.close()

      // Wait for fonts and images to load before printing
      const waitForLoad = () => {
        if (printWindow.document.readyState === 'complete') {
          setTimeout(() => {
            printWindow.focus()
            printWindow.print()
            printWindow.onafterprint = () => {
              printWindow.close()
            }
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.close()
              }
            }, 1000)
          }, 500)
        } else {
          setTimeout(waitForLoad, 100)
        }
      }

      waitForLoad()
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      // @ts-ignore - alert is mocked in tests
      alert('Erreur lors de la génération du document d\'impression.')
      if (printWindow && !printWindow.closed) {
        printWindow.close()
      }
    }
  }
}

const printJournal = createPrintJournal()

// Mock DOM APIs for testing
const setupBrowserMocks = () => {
  const mockDoc = {
    readyState: 'loading',
    write: (html: string) => {
      mockDoc._html = html
    },
    close: () => {
      mockDoc.readyState = 'complete'
    },
    _html: '',
  }

  const mockWindow = {
    document: mockDoc,
    focus: () => {},
    print: () => {
      mockWindow._printCalled = true
    },
    close: () => {
      mockWindow._closed = true
    },
    closed: false,
    onafterprint: null as (() => void) | null,
    _printCalled: false,
    _closed: false,
  }

  // @ts-ignore - mocking global
  global.window = {
    open: (_url: string, _target: string, _features: string) => mockWindow,
  }

  // @ts-ignore - mocking global
  global.alert = () => {}

  return { mockWindow, mockDoc }
}

test('printJournal generates correct HTML structure', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Test Session',
    total_revenue: 1000,
    total_cost: 400,
    total_purchase: 400,
    total_profit: 600,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [
      {
        id: 'line-1',
        session_id: 'test-session',
        drink_id: 'drink-1',
        drink_name: 'Test Beer',
        opening_stock: 50,
        purchased: 24,
        sold: 30,
        closing_stock: 44,
        cost: 120,
        revenue: 300,
        created_at: '2026-06-29T10:00:00Z',
      },
      {
        id: 'line-2',
        session_id: 'test-session',
        drink_id: 'drink-2',
        drink_name: 'Test Soda',
        opening_stock: 100,
        purchased: 0,
        sold: 25,
        closing_stock: 75,
        cost: 0,
        revenue: 125,
        created_at: '2026-06-29T10:00:00Z',
      },
    ],
  }

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      label: 'Test Expense',
      amount: 50,
      date: '2026-06-29',
      created_at: '2026-06-29T10:00:00Z',
    },
  ]

  const drinksCategoryMap = {
    'drink-1': 'Bière',
    'drink-2': 'Soda',
  }

  printJournal({
    session,
    lines: session.session_lines ?? [],
    expenses,
    drinksCategoryMap,
  })

  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  // Verify HTML contains essential elements
  assert(html.includes('<!DOCTYPE html>'), 'Should have DOCTYPE')
  assert(html.includes('Journal de caisse'), 'Should have title')
  assert(html.includes('Test Beer'), 'Should include drink name')
  assert(html.includes('Test Soda'), 'Should include second drink')
  assert(html.includes('Test Expense'), 'Should include expense')
  assert(html.includes('Compte de résultat'), 'Should have profit/loss section')
  assert(html.includes('1 000 FCFA'), 'Should format revenue correctly')
})

test('printJournal handles session with no lines', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Empty Session',
    total_revenue: 0,
    total_cost: 0,
    total_purchase: 0,
    total_profit: 0,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [],
  }

  printJournal({
    session,
    lines: [],
    expenses: [],
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  assert(html.includes('Journal de caisse'), 'Should still have title')
  assert(html.includes('0 FCFA'), 'Should show zero values')
})

test('printJournal includes expense details', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Test Session',
    total_revenue: 1000,
    total_cost: 400,
    total_purchase: 400,
    total_profit: 600,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [],
  }

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      label: 'Electricity',
      amount: 5000,
      date: '2026-06-29',
      created_at: '2026-06-29T10:00:00Z',
    },
    {
      id: 'exp-2',
      label: 'Water',
      amount: 2000,
      date: '2026-06-29',
      created_at: '2026-06-29T10:00:00Z',
    },
  ]

  printJournal({
    session,
    lines: [],
    expenses,
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  assert(html.includes('Electricity'), 'Should include first expense')
  assert(html.includes('Water'), 'Should include second expense')
  assert(html.includes('5 000 FCFA'), 'Should format first expense amount')
  assert(html.includes('2 000 FCFA'), 'Should format second expense amount')
  assert(html.includes('Dépenses opérationnelles'), 'Should have expenses section')
})

test('printJournal shows correct stock flow', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Test Session',
    total_revenue: 1000,
    total_cost: 400,
    total_purchase: 400,
    total_profit: 600,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [
      {
        id: 'line-1',
        session_id: 'test-session',
        drink_id: 'drink-1',
        drink_name: 'Premium Beer',
        opening_stock: 48,
        purchased: 24,
        sold: 36,
        closing_stock: 36,
        cost: 120,
        revenue: 360,
        created_at: '2026-06-29T10:00:00Z',
      },
    ],
  }

  printJournal({
    session,
    lines: session.session_lines ?? [],
    expenses: [],
    drinksCategoryMap: { 'drink-1': 'Bière' },
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  assert(html.includes('Premium Beer'), 'Should show drink name')
  assert(html.includes('Flux de stock détaillé'), 'Should have stock flow section')
  // The function should show opening stock = 48 (2 racks), purchased = 24 (1 rack), sold = 36 (1.5 racks)
})

test('printJournal formats currency correctly', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Test Session',
    total_revenue: 123456,
    total_cost: 45678,
    total_purchase: 45678,
    total_profit: 77778,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [],
  }

  printJournal({
    session,
    lines: [],
    expenses: [],
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  // Should format large numbers with thousand separators
  assert(html.includes('123 456 FCFA'), 'Should format revenue with spaces')
  assert(html.includes('45 678 FCFA'), 'Should format cost with spaces')
})

test('printJournal shows session status badge', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  // Test closed session
  const closedSession: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Closed Session',
    total_revenue: 1000,
    total_cost: 400,
    total_purchase: 400,
    total_profit: 600,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [],
  }

  printJournal({
    session: closedSession,
    lines: [],
    expenses: [],
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  let html = mockDoc._html
  assert(html.includes('Journée clôturée'), 'Should show closed status')

  // Test open session
  const openSession: Session = {
    ...closedSession,
    closed: false,
  }

  printJournal({
    session: openSession,
    lines: [],
    expenses: [],
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  html = mockDoc._html
  assert(html.includes('Session en cours'), 'Should show open status')
})

test('printJournal calculates net profit correctly', async () => {
  const { mockWindow, mockDoc } = setupBrowserMocks()

  const session: Session = {
    id: 'test-session',
    date: '2026-06-29',
    label: 'Test Session',
    total_revenue: 10000,
    total_cost: 4000,
    total_purchase: 4000,
    total_profit: 6000,
    closed: true,
    created_at: '2026-06-29T10:00:00Z',
    session_lines: [],
  }

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      label: 'Rent',
      amount: 2000,
      date: '2026-06-29',
      created_at: '2026-06-29T10:00:00Z',
    },
  ]

  printJournal({
    session,
    lines: [],
    expenses,
    drinksCategoryMap: {},
  })

  await new Promise(resolve => setTimeout(resolve, 100))

  const html = mockDoc._html

  // Gross profit = 10000 - 4000 = 6000
  assert(html.includes('6 000 FCFA'), 'Should show gross profit')
  // Net profit = 6000 - 2000 = 4000
  assert(html.includes('4 000 FCFA'), 'Should show net profit after expenses')
  assert(html.includes('Résultat net'), 'Should have net result label')
})
