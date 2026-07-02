import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfData, calculateSummary, getTopProducts, getCategoryBreakdown, getDailyTrends } from '../services/pdfService'
import { fmt, fmtNum, dateLabelLong, fmtShortBare } from '../utils/helpers'
import { t } from '../i18n'

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

        {/* Top Selling Products Chart */}
        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('misc.pdfTopProducts')}</Text>
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
