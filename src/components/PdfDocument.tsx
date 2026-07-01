import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfData, calculateSummary, getTopProducts, getCategoryBreakdown, getDailyTrends } from '../services/pdfService'
import { fmt, fmtNum, dateLabelLong, fmtShortBare } from '../utils/helpers'

interface PdfDocumentProps {
  data: PdfData
  barName: string
  userName?: string
}

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '2 solid #1E293B',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1 solid #E2E8F0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowHighlight: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: -12,
    marginVertical: 4,
  },
  label: {
    fontSize: 10,
    color: '#64748B',
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  valueLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#0F172A',
  },
  primary: {
    color: '#0F172A',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: '1.5 solid #E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: '0.5 solid #E2E8F0',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 10,
    color: '#0F172A',
  },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#64748B',
    borderTop: '1 solid #E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  // Chart styles
  chartContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartLabel: {
    width: '35%',
    fontSize: 9,
    color: '#0F172A',
    paddingRight: 10,
  },
  chartBarFill: {
    height: 20,
    backgroundColor: '#0F172A',
  },
  chartBarValue: {
    fontSize: 9,
    color: '#64748B',
    marginLeft: 8,
    fontWeight: 'normal',
  },
  insightBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderLeft: '3 solid #0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
})

export function PdfDocument({ data, barName, userName }: PdfDocumentProps) {
  const summary = calculateSummary(data)
  const topProducts = getTopProducts(data, 10)
  const categories = getCategoryBreakdown(data)
  const trends = getDailyTrends(data)
  const periodLabel = getPeriodLabel(data.periodType, data.startDate, data.endDate)
  const now = new Date()
  const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  // Calculate max values for charts
  const maxRevenue = Math.max(...topProducts.map(p => p.revenue), 1)
  const maxCategoryRevenue = Math.max(...categories.map(c => c.revenue), 1)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{barName} - Rapport d'activité</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
          {userName && <Text style={styles.subtitle}>Préparé pour: {userName}</Text>}
          <Text style={styles.subtitle}>Généré le {timestamp}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé Financier</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Nombre de sessions</Text>
            <Text style={styles.value}>{summary.sessionCount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Revenu des ventes</Text>
            <Text style={[styles.value, styles.primary]}>{fmt(summary.totalRevenue)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Unités vendues</Text>
            <Text style={styles.value}>{fmtNum(summary.totalUnitsSold)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Coût des achats</Text>
            <Text style={[styles.value, styles.negative]}>-{fmt(summary.totalCost)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.row, styles.rowHighlight]}>
            <Text style={styles.label}>Marge brute</Text>
            <Text style={[styles.value, summary.grossProfit >= 0 ? styles.positive : styles.negative]}>
              {fmt(summary.grossProfit)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Marge brute (%)</Text>
            <Text style={styles.value}>{summary.grossMarginPercent.toFixed(1)}%</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Dépenses opérationnelles</Text>
            <Text style={[styles.value, styles.negative]}>-{fmt(summary.totalExpenses)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.row, styles.rowHighlight]}>
            <Text style={styles.label}>Résultat net</Text>
            <Text style={[styles.valueLarge, summary.netProfit >= 0 ? styles.positive : styles.negative]}>
              {fmt(summary.netProfit)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Marge nette (%)</Text>
            <Text style={styles.value}>{summary.netMarginPercent.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Top Selling Products Chart */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 10 Produits par Revenu</Text>
            <View style={styles.chartContainer}>
              {topProducts.map((product, index) => {
                const barWidthPercent = maxRevenue > 0 ? (product.revenue / maxRevenue) * 65 : 0
                const barWidth = `${barWidthPercent}%`
                return (
                  <View key={index} style={styles.chartBar}>
                    <Text style={styles.chartLabel}>{product.name}</Text>
                    <View style={[styles.chartBarFill, { width: barWidth }]} />
                    <Text style={styles.chartBarValue}>{fmt(product.revenue)}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {topProducts.length > 0 && `Produit le plus vendu: ${topProducts[0].name} avec ${fmt(topProducts[0].revenue)} de revenu (${fmtNum(topProducts[0].sold)} unités vendues)`}
              </Text>
            </View>
          </View>
        )}

        {/* Category Breakdown Chart */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Répartition par Catégorie</Text>
            <View style={styles.chartContainer}>
              {categories.map((category, index) => {
                const barWidthPercent = maxCategoryRevenue > 0 ? (category.revenue / maxCategoryRevenue) * 65 : 0
                const barWidth = `${barWidthPercent}%`
                return (
                  <View key={index} style={styles.chartBar}>
                    <Text style={styles.chartLabel}>{category.name}</Text>
                    <View style={[styles.chartBarFill, { width: barWidth }]} />
                    <Text style={styles.chartBarValue}>{fmt(category.revenue)}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {categories.length > 0 && `Catégorie dominante: ${categories[0].name} représente ${fmt(categories[0].revenue)} de revenu (${fmtNum(categories[0].sold)} unités)`}
              </Text>
            </View>
          </View>
        )}

        {/* Key Insights */}
        {summary.sessionCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analyses et Insights</Text>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                Revenu moyen par session: {fmt(summary.totalRevenue / summary.sessionCount)}
              </Text>
            </View>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                Marge bénéficiaire: Marge brute de {summary.grossMarginPercent.toFixed(1)}% et marge nette de {summary.netMarginPercent.toFixed(1)}%.
                {summary.netMarginPercent < 20 && ' Considérez optimiser vos coûts opérationnels.'}
                {summary.netMarginPercent >= 20 && summary.netMarginPercent < 30 && ' Performance satisfaisante.'}
                {summary.netMarginPercent >= 30 && ' Excellente rentabilité.'}
              </Text>
            </View>

            {summary.totalUnitsSold > 0 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  Volume de vente: {fmtNum(summary.totalUnitsSold)} unités vendues pour un prix moyen de {fmt(summary.totalRevenue / summary.totalUnitsSold)} par unité.
                </Text>
              </View>
            )}

            {data.expenses.length > 0 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  Dépenses: {data.expenses.length} dépense(s) pour un total de {fmt(summary.totalExpenses)} ({((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1)}% du revenu).
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Sessions Table */}
        {data.sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détail des sessions ({data.sessions.length})</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.col1]}>Date</Text>
                <Text style={[styles.th, styles.col2]}>Revenu</Text>
                <Text style={[styles.th, styles.col3]}>Coût</Text>
                <Text style={[styles.th, styles.col4]}>Profit</Text>
              </View>

              {data.sessions.map((session, index) => (
                <View key={session.id} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                  <Text style={[styles.td, styles.col1]}>{dateLabelLong(session.date)}</Text>
                  <Text style={[styles.td, styles.col2]}>{fmt(session.total_revenue)}</Text>
                  <Text style={[styles.td, styles.col3]}>{fmt(session.total_cost)}</Text>
                  <Text style={[styles.td, styles.col4, session.total_profit >= 0 ? styles.positive : styles.negative]}>
                    {fmt(session.total_profit)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Detailed Products Table */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détail des Produits Vendus</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Produit</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Qté</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Revenu</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Prix moy.</Text>
              </View>

              {topProducts.map((product, index) => {
                const avgPrice = product.sold > 0 ? product.revenue / product.sold : 0
                return (
                  <View key={index} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                    <Text style={[styles.td, { width: '40%' }]}>{product.name}</Text>
                    <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmtNum(product.sold)}</Text>
                    <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmt(product.revenue)}</Text>
                    <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmt(avgPrice)}</Text>
                  </View>
                )
              })}
            </View>

            {topProducts.length > 0 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  Les {topProducts.length} produits ci-dessus représentent {fmt(topProducts.reduce((sum, p) => sum + p.revenue, 0))} de revenu total
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Category Performance Breakdown */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance par Catégorie</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '35%' }]}>Catégorie</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Unités</Text>
                <Text style={[styles.th, { width: '25%', textAlign: 'right' }]}>Revenu</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>% Total</Text>
              </View>

              {categories.map((category, index) => {
                const percentOfTotal = summary.totalRevenue > 0 ? (category.revenue / summary.totalRevenue) * 100 : 0
                return (
                  <View key={index} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                    <Text style={[styles.td, { width: '35%' }]}>{category.name}</Text>
                    <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmtNum(category.sold)}</Text>
                    <Text style={[styles.td, { width: '25%', textAlign: 'right' }]}>{fmt(category.revenue)}</Text>
                    <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{percentOfTotal.toFixed(1)}%</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Session Performance Analysis */}
        {data.sessions.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analyse des Sessions</Text>

            {(() => {
              const sortedByRevenue = [...data.sessions].sort((a, b) => b.total_revenue - a.total_revenue)
              const sortedByProfit = [...data.sessions].sort((a, b) => b.total_profit - a.total_profit)
              const bestSession = sortedByRevenue[0]
              const worstSession = sortedByRevenue[sortedByRevenue.length - 1]
              const mostProfitable = sortedByProfit[0]

              return (
                <>
                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      Meilleure session (revenu): {dateLabelLong(bestSession.date)} - {fmt(bestSession.total_revenue)}
                    </Text>
                  </View>

                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      Session la plus rentable: {dateLabelLong(mostProfitable.date)} - Profit de {fmt(mostProfitable.total_profit)} (Marge: {mostProfitable.total_revenue > 0 ? ((mostProfitable.total_profit / mostProfitable.total_revenue) * 100).toFixed(1) : 0}%)
                    </Text>
                  </View>

                  {bestSession.id !== worstSession.id && (
                    <View style={styles.insightBox}>
                      <Text style={styles.insightText}>
                        Session la plus faible: {dateLabelLong(worstSession.date)} - {fmt(worstSession.total_revenue)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      Écart de performance: Les sessions varient de {fmt(worstSession.total_revenue)} à {fmt(bestSession.total_revenue)} ({bestSession.total_revenue > 0 && worstSession.total_revenue > 0 ? ((bestSession.total_revenue / worstSession.total_revenue).toFixed(1)) : 'N/A'}x).
                    </Text>
                  </View>
                </>
              )
            })()}
          </View>
        )}

        {/* Expenses Table */}
        {data.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dépenses ({data.expenses.length})</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.col1]}>Description</Text>
                <Text style={[styles.th, styles.col2]}>Catégorie</Text>
                <Text style={[styles.th, styles.col3]}>Date</Text>
                <Text style={[styles.th, styles.col4]}>Montant</Text>
              </View>

              {data.expenses.map((expense, index) => (
                <View key={expense.id} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                  <Text style={[styles.td, styles.col1]}>{expense.description}</Text>
                  <Text style={[styles.td, styles.col2]}>{expense.category}</Text>
                  <Text style={[styles.td, styles.col3]}>{expense.date}</Text>
                  <Text style={[styles.td, styles.col4]}>{fmt(expense.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Document généré par {barName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

function getPeriodLabel(periodType: string, startDate: string, endDate: string): string {
  switch (periodType) {
    case 'day':
      return `Journée du ${dateLabelLong(startDate)}`
    case '7days':
      return `7 derniers jours (${startDate} - ${endDate})`
    case '30days':
      return `30 derniers jours (${startDate} - ${endDate})`
    case 'all':
      return `Toutes les périodes (depuis ${startDate})`
    case 'session':
      return `Session du ${dateLabelLong(startDate)}`
    default:
      return `Période: ${startDate} - ${endDate}`
  }
}
