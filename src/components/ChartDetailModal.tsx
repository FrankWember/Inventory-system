import React from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SimpleBarChart, BarChartItem } from './SimpleBarChart'
import { COLORS, fmt, fmtNum } from '../utils/helpers'

export interface ChartDetailRow {
  label: string
  value: number
  sublabel?: string
}

interface ChartDetailModalProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  chartData: BarChartItem[]
  rows: ChartDetailRow[]
  horizontal?: boolean
  formatValue?: (n: number) => string
  valueIsMoney?: boolean
}

export function ChartDetailModal({
  visible,
  onClose,
  title,
  subtitle,
  chartData,
  rows,
  horizontal = false,
  formatValue,
  valueIsMoney = true,
}: ChartDetailModalProps) {
  const format = (n: number) => (valueIsMoney ? fmt(n) : fmtNum(n))
  const chartFormat = formatValue ?? (n => (valueIsMoney ? fmtNum(n) : fmtNum(n)))
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.slateDark} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.chartBox}>
            <SimpleBarChart
              data={chartData}
              height={horizontal ? undefined : 220}
              horizontal={horizontal}
              formatValue={chartFormat}
            />
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total période</Text>
            <Text style={styles.totalValue}>{format(total)}</Text>
          </View>

          <Text style={styles.tableTitle}>Détail</Text>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                {row.sublabel ? <Text style={styles.rowSub}>{row.sublabel}</Text> : null}
              </View>
              <Text style={styles.rowValue}>{format(row.value)}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  closeBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.slateDark },
  subtitle: { fontSize: 13, color: COLORS.slate, marginTop: 2 },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  chartBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.slateDark },
  rowSub: { fontSize: 12, color: COLORS.slate, marginTop: 2 },
  rowValue: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
})
