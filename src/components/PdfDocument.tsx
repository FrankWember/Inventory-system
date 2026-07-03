import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfData, calculateSummary, getTopProducts, getCategoryBreakdown, getDailyTrends, getStockMovements, getStockValueSummary } from '../services/pdfService'
import { fmt, fmtNum, dateLabelLong, fmtShortBare, getCategoryColor } from '../utils/helpers'
import { t } from '../i18n'

// Brand palette (light theme — documents print on white paper). Mirrors
// src/styles/theme.ts so reports look like the app instead of plain black.
const PDF = {
  primary: '#1877F2',
  primarySoft: '#EFF6FF', // light blue tint for highlights/tracks
  emerald: '#059669',
  rose: '#E11D48',
  ink: '#0F172A',
  slate: '#64748B',
  slateMid: '#475569',
  border: '#E2E8F0',
  surface: '#F8FAFC',
} as const

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
    borderBottom: `2 solid ${PDF.primary}`,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PDF.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: PDF.slate,
    marginBottom: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PDF.ink,
    marginBottom: 12,
    paddingBottom: 6,
    paddingLeft: 8,
    borderLeft: `3 solid ${PDF.primary}`,
    borderBottom: `1 solid ${PDF.border}`,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowHighlight: {
    backgroundColor: PDF.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: -12,
    marginVertical: 4,
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    color: PDF.slate,
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: PDF.ink,
  },
  valueLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PDF.ink,
  },
  positive: {
    color: PDF.emerald,
  },
  negative: {
    color: PDF.rose,
  },
  primary: {
    color: PDF.primary,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PDF.primarySoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: `1.5 solid ${PDF.primary}`,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: `0.5 solid ${PDF.border}`,
  },
  tableRowEven: {
    backgroundColor: PDF.surface,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: PDF.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 10,
    color: PDF.ink,
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
    color: PDF.slate,
    borderTop: `1 solid ${PDF.border}`,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: PDF.border,
    marginVertical: 6,
  },
  // Chart styles — label | full-width track with a coloured fill | right-aligned value.
  // The track makes bar lengths comparable at a glance (the old floating bars weren't).
  chartContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  chartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartLabel: {
    width: '28%',
    fontSize: 9,
    color: PDF.ink,
    paddingRight: 8,
  },
  chartTrack: {
    flexGrow: 1,
    height: 12,
    backgroundColor: PDF.primarySoft,
    borderRadius: 6,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: PDF.primary,
  },
  chartBarValue: {
    width: 112,
    fontSize: 8,
    color: PDF.slateMid,
    marginLeft: 8,
    textAlign: 'right',
    fontWeight: 'normal',
  },
  insightBox: {
    backgroundColor: PDF.primarySoft,
    padding: 12,
    borderLeft: `3 solid ${PDF.primary}`,
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 10,
    color: PDF.slateMid,
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

  // Session-specific data
  const isSessionReport = data.periodType === 'session' || data.sessions.length === 1
  const stockMovements = getStockMovements(data)
  const stockValues = getStockValueSummary(data)

  // Calculate max values for charts
  const maxRevenue = Math.max(...topProducts.map(p => p.revenue), 1)
  const maxCategoryRevenue = Math.max(...categories.map(c => c.revenue), 1)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{barName} - {t('misc.pdfReportTitle')}</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
          {userName && <Text style={styles.subtitle}>{t('misc.pdfPreparedFor', { name: userName })}</Text>}
          <Text style={styles.subtitle}>{t('misc.pdfGeneratedOn', { timestamp })}</Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('misc.pdfFinancialSummary')}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfSessionCount')}</Text>
            <Text style={styles.value}>{summary.sessionCount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfSalesRevenue')}</Text>
            <Text style={[styles.value, styles.primary]}>{fmt(summary.totalRevenue)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfUnitsSold')}</Text>
            <Text style={styles.value}>{fmtNum(summary.totalUnitsSold)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfPurchaseCost')}</Text>
            <Text style={[styles.value, styles.negative]}>-{fmt(summary.totalCost)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.row, styles.rowHighlight]}>
            <Text style={styles.label}>{t('misc.pdfGrossMargin')}</Text>
            <Text style={[styles.value, summary.grossProfit >= 0 ? styles.positive : styles.negative]}>
              {fmt(summary.grossProfit)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfGrossMarginPct')}</Text>
            <Text style={styles.value}>{summary.grossMarginPercent.toFixed(1)}%</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfOperatingExpenses')}</Text>
            <Text style={[styles.value, styles.negative]}>-{fmt(summary.totalExpenses)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.row, styles.rowHighlight]}>
            <Text style={styles.label}>{t('misc.pdfNetResult')}</Text>
            <Text style={[styles.valueLarge, summary.netProfit >= 0 ? styles.positive : styles.negative]}>
              {fmt(summary.netProfit)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('misc.pdfNetMarginPct')}</Text>
            <Text style={styles.value}>{summary.netMarginPercent.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Stock Value Summary - Session Reports Only */}
        {isSessionReport && stockMovements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valeur du Stock</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Stock d'ouverture (valeur)</Text>
              <Text style={styles.value}>{fmt(stockValues.totalOpeningValue)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Achats (valeur)</Text>
              <Text style={styles.value}>{fmt(stockValues.totalPurchaseCost)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Stock de clôture (valeur)</Text>
              <Text style={styles.value}>{fmt(stockValues.totalClosingValue)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={[styles.row, styles.rowHighlight]}>
              <Text style={styles.label}>Variation de stock</Text>
              <Text style={[styles.value, stockValues.stockVariance >= 0 ? styles.positive : styles.negative]}>
                {fmt(stockValues.stockVariance)}
              </Text>
            </View>
          </View>
        )}

        {/* Stock Movement Table - Session Reports Only */}
        {isSessionReport && stockMovements.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Mouvement de Stock</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '20%' }]}>Article</Text>
                <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Ouv.</Text>
                <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Reçu</Text>
                <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Disp.</Text>
                <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Compté</Text>
                <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Vendu</Text>
                <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Val. Ouv.</Text>
                <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Val. Clô.</Text>
              </View>

              {stockMovements.map((movement, index) => (
                <View key={index} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                  <Text style={[styles.td, { width: '20%' }]}>{movement.name}</Text>
                  <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{fmtNum(movement.opening)}</Text>
                  <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{fmtNum(movement.purchased)}</Text>
                  <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{fmtNum(movement.available)}</Text>
                  <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{fmtNum(movement.counted)}</Text>
                  <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{fmtNum(movement.sold)}</Text>
                  <Text style={[styles.td, { width: '15%', textAlign: 'right' }]}>{fmt(movement.openingValue)}</Text>
                  <Text style={[styles.td, { width: '15%', textAlign: 'right' }]}>{fmt(movement.closingValue)}</Text>
                </View>
              ))}

              {/* Totals Row */}
              <View style={[styles.tableRow, styles.rowHighlight]}>
                <Text style={[styles.td, { width: '20%', fontWeight: 'bold' }]}>TOTAL</Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}></Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}></Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}></Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}></Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {fmtNum(stockMovements.reduce((sum, m) => sum + m.sold, 0))}
                </Text>
                <Text style={[styles.td, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {fmt(stockValues.totalOpeningValue)}
                </Text>
                <Text style={[styles.td, { width: '15%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {fmt(stockValues.totalClosingValue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Purchase Details Table - Session Reports Only */}
        {isSessionReport && stockMovements.filter(m => m.purchased > 0).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails des Achats</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '40%' }]}>Article</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Quantité</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Coût Unit.</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Coût Total</Text>
              </View>

              {stockMovements.filter(m => m.purchased > 0).map((movement, index) => (
                <View key={index} style={index % 2 === 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}>
                  <Text style={[styles.td, { width: '40%' }]}>{movement.name}</Text>
                  <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmtNum(movement.purchased)}</Text>
                  <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmt(movement.unitCost)}</Text>
                  <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>{fmt(movement.purchaseCost)}</Text>
                </View>
              ))}

              {/* Totals Row */}
              <View style={[styles.tableRow, styles.rowHighlight]}>
                <Text style={[styles.td, { width: '40%', fontWeight: 'bold' }]}>TOTAL</Text>
                <Text style={[styles.td, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {fmtNum(stockMovements.reduce((sum, m) => sum + m.purchased, 0))}
                </Text>
                <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}></Text>
                <Text style={[styles.td, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>
                  {fmt(stockValues.totalPurchaseCost)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Selling Products Chart */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfTopProducts')}</Text>
            <View style={styles.chartContainer}>
              {topProducts.map((product, index) => {
                const pct = maxRevenue > 0 ? Math.max((product.revenue / maxRevenue) * 100, 2) : 0
                return (
                  <View key={index} style={styles.chartBar}>
                    <Text style={styles.chartLabel}>{product.name}</Text>
                    <View style={styles.chartTrack}>
                      <View style={[styles.chartBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.chartBarValue}>{fmt(product.revenue)}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {topProducts.length > 0 && t('misc.pdfTopProductInsight', { name: topProducts[0].name, revenue: fmt(topProducts[0].revenue), units: fmtNum(topProducts[0].sold) })}
              </Text>
            </View>
          </View>
        )}

        {/* Category Breakdown Chart */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfCategoryBreakdown')}</Text>
            <View style={styles.chartContainer}>
              {categories.map((category, index) => {
                const pct = maxCategoryRevenue > 0 ? Math.max((category.revenue / maxCategoryRevenue) * 100, 2) : 0
                const share = summary.totalRevenue > 0 ? Math.round((category.revenue / summary.totalRevenue) * 100) : 0
                return (
                  <View key={index} style={styles.chartBar}>
                    <Text style={styles.chartLabel}>{category.name}</Text>
                    <View style={styles.chartTrack}>
                      {/* Same distinct-hue palette as the in-app category chart */}
                      <View style={[styles.chartBarFill, { width: `${pct}%`, backgroundColor: getCategoryColor(category.name) }]} />
                    </View>
                    <Text style={styles.chartBarValue}>{`${share}% · ${fmt(category.revenue)}`}</Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {categories.length > 0 && t('misc.pdfCategoryInsight', { name: categories[0].name, revenue: fmt(categories[0].revenue), units: fmtNum(categories[0].sold) })}
              </Text>
            </View>
          </View>
        )}

        {/* Key Insights */}
        {summary.sessionCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfInsightsTitle')}</Text>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {t('misc.pdfAvgRevenuePerSession', { value: fmt(summary.totalRevenue / summary.sessionCount) })}
              </Text>
            </View>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                {t('misc.pdfMarginInsight', { gross: summary.grossMarginPercent.toFixed(1), net: summary.netMarginPercent.toFixed(1) })}
                {summary.netMarginPercent < 20 && ' ' + t('misc.pdfMarginLow')}
                {summary.netMarginPercent >= 20 && summary.netMarginPercent < 30 && ' ' + t('misc.pdfMarginOk')}
                {summary.netMarginPercent >= 30 && ' ' + t('misc.pdfMarginGreat')}
              </Text>
            </View>

            {summary.totalUnitsSold > 0 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  {t('misc.pdfVolumeInsight', { units: fmtNum(summary.totalUnitsSold), avg: fmt(summary.totalRevenue / summary.totalUnitsSold) })}
                </Text>
              </View>
            )}

            {data.expenses.length > 0 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  {t('misc.pdfExpensesInsight', { count: data.expenses.length, total: fmt(summary.totalExpenses), percent: ((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(1) })}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Sessions Table */}
        {data.sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfSessionsDetail', { count: data.sessions.length })}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.col1]}>{t('misc.pdfColDate')}</Text>
                <Text style={[styles.th, styles.col2]}>{t('misc.pdfColRevenue')}</Text>
                <Text style={[styles.th, styles.col3]}>{t('misc.pdfColCost')}</Text>
                <Text style={[styles.th, styles.col4]}>{t('misc.pdfColProfit')}</Text>
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
            <Text style={styles.sectionTitle}>{t('misc.pdfProductsDetail')}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '40%' }]}>{t('misc.pdfColProduct')}</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>{t('misc.pdfColQty')}</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>{t('misc.pdfColRevenue')}</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>{t('misc.pdfColAvgPrice')}</Text>
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
                  {t('misc.pdfTopProductsTotal', { count: topProducts.length, total: fmt(topProducts.reduce((sum, p) => sum + p.revenue, 0)) })}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Category Performance Breakdown */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfCategoryPerformance')}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: '35%' }]}>{t('misc.pdfColCategory')}</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>{t('misc.pdfColUnits')}</Text>
                <Text style={[styles.th, { width: '25%', textAlign: 'right' }]}>{t('misc.pdfColRevenue')}</Text>
                <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>{t('misc.pdfColPctTotal')}</Text>
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
            <Text style={styles.sectionTitle}>{t('misc.pdfSessionAnalysis')}</Text>

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
                      {t('misc.pdfBestSession', { date: dateLabelLong(bestSession.date), revenue: fmt(bestSession.total_revenue) })}
                    </Text>
                  </View>

                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      {t('misc.pdfMostProfitable', { date: dateLabelLong(mostProfitable.date), profit: fmt(mostProfitable.total_profit), margin: mostProfitable.total_revenue > 0 ? ((mostProfitable.total_profit / mostProfitable.total_revenue) * 100).toFixed(1) : 0 })}
                    </Text>
                  </View>

                  {bestSession.id !== worstSession.id && (
                    <View style={styles.insightBox}>
                      <Text style={styles.insightText}>
                        {t('misc.pdfWeakestSession', { date: dateLabelLong(worstSession.date), revenue: fmt(worstSession.total_revenue) })}
                      </Text>
                    </View>
                  )}

                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      {t('misc.pdfPerformanceGap', { min: fmt(worstSession.total_revenue), max: fmt(bestSession.total_revenue), ratio: bestSession.total_revenue > 0 && worstSession.total_revenue > 0 ? ((bestSession.total_revenue / worstSession.total_revenue).toFixed(1)) : 'N/A' })}
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
            <Text style={styles.sectionTitle}>{t('misc.pdfExpensesTitle', { count: data.expenses.length })}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.col1]}>{t('misc.pdfColDescription')}</Text>
                <Text style={[styles.th, styles.col2]}>{t('misc.pdfColCategory')}</Text>
                <Text style={[styles.th, styles.col3]}>{t('misc.pdfColDate')}</Text>
                <Text style={[styles.th, styles.col4]}>{t('misc.pdfColAmount')}</Text>
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
          <Text>{t('misc.pdfFooterGeneratedBy', { name: barName })}</Text>
          <Text render={({ pageNumber, totalPages }) => t('misc.pdfPageOf', { page: pageNumber, total: totalPages })} />
        </View>
      </Page>
    </Document>
  )
}

function getPeriodLabel(periodType: string, startDate: string, endDate: string): string {
  switch (periodType) {
    case 'day':
      return t('misc.pdfPeriodDay', { date: dateLabelLong(startDate) })
    case '7days':
      return t('misc.pdfPeriod7days', { start: startDate, end: endDate })
    case '30days':
      return t('misc.pdfPeriod30days', { start: startDate, end: endDate })
    case 'all':
      return t('misc.pdfPeriodAll', { start: startDate })
    case 'session':
      return t('misc.pdfPeriodSession', { date: dateLabelLong(startDate) })
    default:
      return t('misc.pdfPeriodDefault', { start: startDate, end: endDate })
  }
}
