import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { DrinkConfig } from '../../contexts/OnboardingContext'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS, fmt } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'
import { Badge } from '../Badge'

type Colors = typeof LIGHT_COLORS

interface DrinkConfigCardProps {
  drink: DrinkTemplate
  config?: DrinkConfig
  onPress: () => void
}

export function DrinkConfigCard({ drink, config, onPress }: DrinkConfigCardProps) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const isConfigured = !!config && config.price > 0 && config.cassierCost > 0 && config.cassierQuantity > 0

  const costPerUnit = config && config.cassierQuantity > 0
    ? Math.round(config.cassierCost / config.cassierQuantity)
    : 0
  const profitPerUnit = config ? config.price - costPerUnit : 0
  const marginPercent = config && config.price > 0
    ? ((profitPerUnit / config.price) * 100).toFixed(0)
    : '0'

  return (
    <TouchableOpacity
      style={[styles.container, isConfigured && styles.containerConfigured]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{drink.name}</Text>
          {isConfigured ? (
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={14} color={colors.white} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
          )}
        </View>
        <Badge variant="default">{drink.category}</Badge>
      </View>

      {isConfigured && config ? (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('onboarding.customizeSalePrice')}</Text>
            <Text style={styles.detailValue}>{fmt(config.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('onboarding.customizeUnitCost')}</Text>
            <Text style={styles.detailValue}>{fmt(costPerUnit)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('onboarding.customizeMargin')}</Text>
            <Text style={[styles.detailValue, styles.profit]}>
              {fmt(profitPerUnit)} ({marginPercent}%)
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.unconfiguredText}>{t('onboarding.customizeTapToConfig')}</Text>
      )}
    </TouchableOpacity>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.card,
      borderRadius: RADIUS.md,
      padding: SPACE.lg,
      marginBottom: SPACE.md,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    containerConfigured: {
      borderColor: c.emerald,
      backgroundColor: c.emeraldLight,
    },
    header: {
      gap: SPACE.sm,
      marginBottom: SPACE.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACE.sm,
    },
    name: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.slateDark,
      flex: 1,
    },
    checkIcon: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.pill,
      backgroundColor: c.emerald,
      justifyContent: 'center',
      alignItems: 'center',
    },
    details: {
      marginTop: SPACE.xs,
      gap: SPACE.xs,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailLabel: {
      ...TYPE.body,
      color: c.slate,
    },
    detailValue: {
      ...TYPE.bodyMedium,
      fontFamily: FONT.semibold,
      color: c.inkSoft,
      fontVariant: ['tabular-nums'],
    },
    profit: {
      color: c.emerald,
    },
    unconfiguredText: {
      ...TYPE.body,
      color: c.slate400,
      fontStyle: 'italic',
      marginTop: SPACE.xs,
    },
  })
}
