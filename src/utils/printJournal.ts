import { Session, Expense } from '../types'
import { fmt, fmtNum, dateLabelLong, formatWithCassiers } from './helpers'

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

interface PrintData {
  session: Session
  lines: SessionLine[]
  expenses: Expense[]
  drinksCategoryMap: Record<string, string>
}

export function printJournal(data: PrintData): Promise<void> {
  return new Promise((resolve, reject) => {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      console.warn('Print function can only run in browser environment')
      reject(new Error('Not in browser environment'))
      return
    }

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
  <title>Journal de caisse - ${dateLabelLong(session.date)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      padding: 0;
      margin: 0;
      background: white;
    }

    @page {
      margin: 1.5cm;
      size: A4 portrait;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 3px solid #4A90E2;
    }

    .header h1 {
      font-size: 28pt;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 8px;
    }

    .header .date {
      font-size: 14pt;
      color: #64748b;
      font-weight: 500;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #dbeafe;
      padding: 8px 16px;
      border-radius: 12px;
      margin-top: 16px;
      font-weight: 600;
      color: #1e40af;
      font-size: 11pt;
    }

    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 16pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .subsection-title {
      font-size: 13pt;
      font-weight: 700;
      color: #334155;
      margin-top: 20px;
      margin-bottom: 12px;
    }

    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .row:last-child {
      border-bottom: none;
    }

    .row-label {
      font-weight: 500;
      color: #475569;
    }

    .row-value {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .row-positive {
      color: #059669;
    }

    .row-negative {
      color: #dc2626;
    }

    .row-primary {
      color: #4A90E2;
    }

    .row-muted {
      font-size: 10pt;
      color: #94a3b8;
    }

    .breakdown {
      margin-left: 24px;
      margin-top: 12px;
      padding-left: 16px;
      border-left: 3px solid #dbeafe;
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 10pt;
      color: #64748b;
    }

    .divider {
      height: 2px;
      background: #e2e8f0;
      margin: 16px 0;
    }

    .total-row {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      margin-top: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }

    thead {
      background: #f8fafc;
      border-bottom: 2px solid #4A90E2;
    }

    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 9pt;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    th:first-child {
      text-align: left;
    }

    th:not(:first-child) {
      text-align: center;
    }

    td {
      padding: 10px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10pt;
    }

    td:first-child {
      font-weight: 600;
      color: #1e293b;
    }

    td:not(:first-child) {
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tfoot {
      background: #dbeafe;
      font-weight: 700;
    }

    tfoot td {
      padding: 12px 8px;
      border-top: 2px solid #4A90E2;
    }

    .text-green {
      color: #059669;
      font-weight: 700;
    }

    .text-blue {
      color: #4A90E2;
      font-weight: 700;
    }

    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #94a3b8;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .section {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Journal de caisse</h1>
    <div class="date">${dateLabelLong(session.date)}</div>
    ${session.closed ? '<div class="badge">✓ Journée clôturée</div>' : '<div class="badge">⏱ Session en cours</div>'}
  </div>

  <!-- Compte de résultat -->
  <div class="section">
    <div class="section-title">Compte de résultat</div>

    <div class="card">
      <div class="subsection-title">Revenus</div>
      <div class="row">
        <span class="row-label">Ventes totales</span>
        <span class="row-value row-positive">${fmt(session.total_revenue)}</span>
      </div>
      <div class="row row-muted">
        <span class="row-label">Unités vendues (${fmtNum(totalUnits)})</span>
        <span class="row-value"></span>
      </div>
      ${saleLines.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail par article:</div>
          ${saleLines.slice(0, 5).map(line => `
            <div class="breakdown-item">
              <span>${line.drink_name}</span>
              <span style="font-weight: 600;">${fmt(line.revenue)}</span>
            </div>
          `).join('')}
          ${saleLines.length > 5 ? `<div style="font-size: 9pt; color: #94a3b8; font-style: italic; margin-top: 8px;">...et ${saleLines.length - 5} autres</div>` : ''}
        </div>
      ` : ''}

      <div class="divider"></div>

      <div class="subsection-title">Coûts et dépenses</div>
      <div class="row">
        <span class="row-label">Coût des achats</span>
        <span class="row-value row-negative">-${fmt(session.total_cost)}</span>
      </div>
      ${purchaseLines.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail des achats:</div>
          ${purchaseLines.map(line => `
            <div class="breakdown-item">
              <span>${line.drink_name} (${fmtNum(line.purchased)})</span>
              <span style="font-weight: 600;">-${fmt(line.cost)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="row">
        <span class="row-label">Dépenses opérationnelles</span>
        <span class="row-value row-negative">-${fmt(totalExpenses)}</span>
      </div>
      ${expenses.length > 0 ? `
        <div class="breakdown">
          <div style="font-size: 10pt; font-weight: 600; color: #64748b; margin-bottom: 8px;">Détail des dépenses:</div>
          ${expenses.map(exp => `
            <div class="breakdown-item">
              <span>${exp.label}</span>
              <span style="font-weight: 600;">-${fmt(exp.amount)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="divider"></div>

      <div class="row">
        <span class="row-label" style="font-weight: 600;">Marge brute</span>
        <span class="row-value row-primary">${fmt(grossProfit)}</span>
      </div>
      <div class="row row-muted">
        <span class="row-label">Taux de marge</span>
        <span class="row-value">${session.total_revenue > 0 ? ((grossProfit / session.total_revenue) * 100).toFixed(1) : 0}%</span>
      </div>

      <div class="divider"></div>

      <div class="total-row">
        <div class="row" style="border: none;">
          <span style="font-size: 12pt; font-weight: 700;">Résultat net</span>
          <span style="font-size: 14pt; font-weight: 700; color: ${netProfit >= 0 ? '#4A90E2' : '#dc2626'};">${fmt(netProfit)}</span>
        </div>
        <div class="row row-muted" style="border: none; padding-top: 4px;">
          <span class="row-label">Rentabilité nette</span>
          <span class="row-value">${session.total_revenue > 0 ? ((netProfit / session.total_revenue) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Flux de stock -->
  ${lines.filter(l => l.opening_stock > 0 || l.purchased > 0 || l.sold > 0).length > 0 ? `
    <div class="section">
      <div class="section-title">Flux de stock détaillé (${lines.filter(l => l.opening_stock > 0 || l.purchased > 0 || l.sold > 0).length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 30%;">Article</th>
            <th>Départ</th>
            <th>Achats</th>
            <th>Après achats</th>
            <th>Vendus</th>
            <th>Final</th>
          </tr>
        </thead>
        <tbody>
          ${lines
            .filter(l => l.opening_stock > 0 || l.purchased > 0 || l.sold > 0)
            .map(line => {
              const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
              const afterPurchase = line.opening_stock + line.purchased
              return `
                <tr>
                  <td>${line.drink_name}</td>
                  <td>${formatWithCassiers(line.opening_stock, cat)}</td>
                  <td class="${line.purchased > 0 ? 'text-green' : ''}">${line.purchased > 0 ? '+' + formatWithCassiers(line.purchased, cat) : '-'}</td>
                  <td>${formatWithCassiers(afterPurchase, cat)}</td>
                  <td class="${line.sold > 0 ? 'text-blue' : ''}">${line.sold > 0 ? formatWithCassiers(line.sold, cat) : '-'}</td>
                  <td>${formatWithCassiers(line.closing_stock, cat)}</td>
                </tr>
              `
            }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Totaux</td>
            <td>${fmtNum(lines.reduce((s, l) => s + l.opening_stock, 0))}</td>
            <td class="text-green">+${fmtNum(lines.reduce((s, l) => s + l.purchased, 0))}</td>
            <td>${fmtNum(lines.reduce((s, l) => s + l.opening_stock + l.purchased, 0))}</td>
            <td class="text-blue">${fmtNum(lines.reduce((s, l) => s + l.sold, 0))}</td>
            <td>${fmtNum(lines.reduce((s, l) => s + l.closing_stock, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  ` : ''}

  <!-- Achats -->
  ${purchaseLines.length > 0 ? `
    <div class="section">
      <div class="section-title">Réceptions / Achats (${purchaseLines.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Article</th>
            <th>Quantité</th>
            <th>Coût</th>
          </tr>
        </thead>
        <tbody>
          ${purchaseLines.map(line => `
            <tr>
              <td>${line.drink_name}</td>
              <td>${fmtNum(line.purchased)}</td>
              <td>${fmt(line.cost)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <!-- Ventes -->
  ${saleLines.length > 0 ? `
    <div class="section">
      <div class="section-title">Ventes (${saleLines.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Article</th>
            <th>Vendu</th>
            <th>Revenu</th>
          </tr>
        </thead>
        <tbody>
          ${saleLines.map(line => {
            const cat = drinksCategoryMap[line.drink_id] ?? 'Autre'
            return `
              <tr>
                <td>${line.drink_name}</td>
                <td>${formatWithCassiers(line.sold, cat)}</td>
                <td>${fmt(line.revenue)}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <!-- Dépenses -->
  ${expenses.length > 0 ? `
    <div class="section">
      <div class="section-title">Dépenses opérationnelles (${expenses.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 70%;">Description</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(exp => `
            <tr>
              <td>${exp.label}</td>
              <td>${fmt(exp.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''}

  <div class="footer">
    <div>Imprimé le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    <div style="margin-top: 8px;">BarTrack - Système de gestion d'inventaire</div>
  </div>
</body>
</html>
  `

    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600')

    if (!printWindow) {
      window.alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les popups pour ce site.')
      reject(new Error('Failed to open print window'))
      return
    }

    try {
      printWindow.document.write(html)
      printWindow.document.close()

      // Improved font loading detection using document.fonts API
      const waitForFontsAndPrint = () => {
        // Modern browsers support document.fonts.ready
        if (printWindow.document.fonts && typeof printWindow.document.fonts.ready !== 'undefined') {
          printWindow.document.fonts.ready
            .then(() => {
              // Fonts are loaded, wait a bit more for layout to settle
              setTimeout(() => {
                triggerPrint()
              }, 300)
            })
            .catch((error: unknown) => {
              console.warn('Font loading error, proceeding with print anyway:', error)
              // Proceed with printing even if font loading fails
              setTimeout(() => {
                triggerPrint()
              }, 300)
            })
        } else {
          // Fallback for browsers without document.fonts API
          // Just wait for document ready state
          waitForDocumentReady()
        }
      }

      // Fallback method: wait for document readyState
      const waitForDocumentReady = () => {
        if (printWindow.document.readyState === 'complete') {
          // Additional delay for fonts to render (fallback)
          setTimeout(() => {
            triggerPrint()
          }, 500)
        } else {
          // Keep checking until ready
          setTimeout(waitForDocumentReady, 100)
        }
      }

      // Trigger the actual print
      const triggerPrint = () => {
        try {
          printWindow.focus()
          printWindow.print()

          // Close window after printing or if user cancels
          printWindow.onafterprint = () => {
            printWindow.close()
            resolve() // Resolve promise when printing is complete
          }

          // Fallback: close after some time if onafterprint doesn't fire
          // This handles cases where the user cancels the print dialog
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close()
            }
            resolve() // Resolve promise after timeout
          }, 2000)
        } catch (printError) {
          console.error('Error triggering print:', printError)
          window.alert('Erreur lors du lancement de l\'impression.')
          printWindow.close()
          reject(printError)
        }
      }

      // Start the loading and printing process
      waitForFontsAndPrint()
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      window.alert('Erreur lors de la génération du document d\'impression.')
      if (printWindow && !printWindow.closed) {
        printWindow.close()
      }
      reject(error)
    }
  })
}
