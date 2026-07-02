import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS, fmt } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'
import { Category } from '../../types'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'StockOverview'>
type Colors = typeof LIGHT_COLORS

export default function OnboardingStockOverviewScreen({ navigation }: Props) {
  const { state } = useOnboarding()
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const drinksByCategory = useMemo(() => {
    const grouped: Record<Category, typeof state.selectedDrinks> = {
      Bière: [], Soda: [], Jus: [], Eau: [], Vin: [], Autre: [],
    }
    state.selectedDrinks.forEach(d => grouped[d.category].push(d))
    return grouped
  }, [state.selectedDrinks])

  const categoriesWithDrinks = Object.values(drinksByCategory).filter(d => d.length > 0).length

  // Calculate total stock quantity across all drinks
  const totalStockQuantity = useMemo(() => {
    let total = 0
    state.selectedDrinks.forEach(d => {
      const c = state.drinkConfigs.get(d.name)
      if (c && c.initialStock) total += c.initialStock
    })
    return total
  }, [state.selectedDrinks, state.drinkConfigs])

  // Calculate total stock value (quantity * unit cost)
  const totalStockValue = useMemo(() => {
    let total = 0
    state.selectedDrinks.forEach(d => {
      const c = state.drinkConfigs.get(d.name)
      if (c && c.initialStock && c.cassierCost && c.cassierQuantity) {
        const costPerUnit = c.cassierCost / c.cassierQuantity
        total += c.initialStock * costPerUnit
      }
    })
    return Math.round(total)
  }, [state.selectedDrinks, state.drinkConfigs])

  return (
    <OnboardingLayout
      step={4}
      maxWidth={640}
      title={t('onboarding.reviewTitle')}
      subtitle={t('onboarding.reviewDescription')}
      onBack={() => navigation.goBack()}
      footer={
        <Button variant="primary" size="large" onPress={() => navigation.navigate('Tour')}>
          {t('onboarding.continue')}
        </Button>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACE.md }}>
        {/* Summary tiles */}
        <View style={styles.stats}>
          <StatTile value={String(state.selectedDrinks.length)} label={t('onboarding.reviewStatDrinks')} styles={styles} />
          <StatTile value={String(totalStockQuantity)} label={t('onboarding.reviewStatStock')} styles={styles} />
          <StatTile value={fmt(totalStockValue)} label={t('onboarding.reviewStatValue')} styles={styles} />
        </View>

        <Text style={styles.sectionTitle}>{t('onboarding.reviewYourDrinks')}</Text>

        {Object.entries(drinksByCategory).map(([category, drinks]) => {
          if (drinks.length === 0) return null
          const countLabel = drinks.length === 1
            ? t('onboarding.reviewDrinksCountOne', { count: drinks.length })
            : t('onboarding.reviewDrinksCountMany', { count: drinks.length })
          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Badge variant="default">{category}</Badge>
                <Text style={styles.categoryCount}>{countLabel}</Text>
              </View>
              <View style={styles.drinkGrid}>
                {drinks.map(drink => {
                  const config = state.drinkConfigs.get(drink.name)
                  return (
                    <View key={drink.name} style={styles.drinkItem}>
                      <Text style={styles.drinkName} numberOfLines={1}>{drink.name}</Text>
                      {config && (
                        <View style={styles.drinkDetails}>
                          <Text style={styles.drinkPrice}>{fmt(config.price)}</Text>
                          <Text style={styles.drinkStock}>{t('onboarding.reviewStockLabel')}</Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          )
        })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('onboarding.reviewNextTitle')}</Text>
            <Text style={styles.infoText}>{t('onboarding.reviewNextText')}</Text>
          </View>
        </View>
      </ScrollView>
    </OnboardingLayout>
  )
}

function StatTile({ value, label, styles }: { value: string; label: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    stats: {
      flexDirection: 'row',
      gap: SPACE.md,
      marginBottom: SPACE['2xl'],
    },
    statTile: {
      flex: 1,
      padding: SPACE.lg,
      backgroundColor: c.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontFamily: FONT.bold,
      color: c.primary,
      marginBottom: SPACE.xs,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontSize: 11,
      fontFamily: FONT.medium,
      color: c.slate,
      textAlign: 'center',
      lineHeight: 14,
    },
    sectionTitle: {
      ...TYPE.h2,
      color: c.slateDark,
      marginBottom: SPACE.lg,
    },
    categorySection: {
      marginBottom: SPACE.xl,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
    },
    categoryCount: {
      ...TYPE.small,
      color: c.slate,
    },
    drinkGrid: {
      gap: SPACE.sm,
    },
    drinkItem: {
      padding: SPACE.md,
      backgroundColor: c.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    drinkName: {
      ...TYPE.bodyMedium,
      fontFamily: FONT.semibold,
      color: c.slateDark,
      marginBottom: SPACE.xs,
    },
    drinkDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    drinkPrice: {
      ...TYPE.bodyMedium,
      fontFamily: FONT.semibold,
      color: c.primary,
      fontVariant: ['tabular-nums'],
    },
    drinkStock: {
      ...TYPE.small,
      color: c.slate400,
    },
    infoBox: {
      flexDirection: 'row',
      gap: SPACE.md,
      padding: SPACE.lg,
      backgroundColor: c.primaryLight,
      borderRadius: RADIUS.md,
      marginTop: SPACE.sm,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.primaryDark,
      marginBottom: SPACE.xs,
    },
    infoText: {
      ...TYPE.body,
      color: c.primaryDark,
      lineHeight: 20,
    },
  })
}
