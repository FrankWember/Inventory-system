import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card, CardHeader, CardContent } from './Card'
import { SimpleBarChart, BarChartItem } from './SimpleBarChart'
import { FONT } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'

interface ExpandableChartCardProps {
  title: string
  subtitle?: string
  data: BarChartItem[]
  height?: number
  horizontal?: boolean
  formatValue?: (n: number) => string
  onExpand?: () => void
}

export function ExpandableChartCard({
  title,
  subtitle,
  data,
  height = 150,
  horizontal = false,
  formatValue,
  onExpand,
}: ExpandableChartCardProps) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  if (data.length === 0) return null

  const headerContent = (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <CardHeader title={title} subtitle={subtitle} style={{ marginBottom: 0 }} />
      </View>
      {onExpand && (
        <View style={styles.expandBtn}>
          <Ionicons name="expand" size={18} color={colors.primary} />
          <Text style={[styles.expandText, { color: colors.primary }]}>{t('common.expand')}</Text>
        </View>
      )}
    </View>
  )

  return (
    <Card>
      {onExpand ? (
        <TouchableOpacity onPress={onExpand} activeOpacity={0.85}>
          {headerContent}
        </TouchableOpacity>
      ) : (
        headerContent
      )}
      <CardContent>
        <SimpleBarChart data={data} height={height} horizontal={horizontal} formatValue={formatValue} />
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  expandText: { fontSize: 12, fontFamily: FONT.semibold },
})
