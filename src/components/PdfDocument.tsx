import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfData, calculateSummary } from '../services/pdfService'
import { fmt, fmtNum, dateLabelLong } from '../utils/helpers'

interface PdfDocumentProps {
  data: PdfData
  barName: string
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
    borderBottom: '2 solid #4A90E2',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowHighlight: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: -8,
    borderRadius: 4,
  },
  label: {
    fontSize: 10,
    color: '#64748b',
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  valueLarge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  primary: {
    color: '#4A90E2',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '1 solid #e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '0.5 solid #f1f5f9',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  th: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 9,
    color: '#1e293b',
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
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '0.5 solid #e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
})

export function PdfDocument({ data, barName }: PdfDocumentProps) {
  const summary = calculateSummary(data)
  const periodLabel = getPeriodLabel(data.periodType, data.startDate, data.endDate)
  const now = new Date()
  const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{barName} - Rapport d'activité</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
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
    default:
      return `Période: ${startDate} - ${endDate}`
  }
}
