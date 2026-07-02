import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { COLORS, fmt } from '../../utils/helpers'
import { Category } from '../../types'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'StockOverview'>

export default function OnboardingStockOverviewScreen({ navigation }: Props) {
  const { state } = useOnboarding()

  // Group drinks by category
  const drinksByCategory = useMemo(() => {
    const grouped: Record<Category, typeof state.selectedDrinks> = {
      Bière: [],
      Soda: [],
      Jus: [],
      Eau: [],
      Vin: [],
      Autre: [],
    }

    state.selectedDrinks.forEach(drink => {
      grouped[drink.category].push(drink)
    })

    return grouped
  }, [state.selectedDrinks])

  // Count categories with drinks
  const categoriesWithDrinks = Object.values(drinksByCategory).filter(drinks => drinks.length > 0).length

  // Calculate total value (all drinks have stock=0 initially, but show potential)
  const totalPotentialValue = useMemo(() => {
    let total = 0
    state.selectedDrinks.forEach(drink => {
      const config = state.drinkConfigs.get(drink.name)
      if (config) {
        // Estimate value of one cassier
        total += config.cassierCost
      }
    })
    return total
  }, [state.selectedDrinks, state.drinkConfigs])

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={4} totalSteps={5} stepTitle="Aperçu du stock" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Votre inventaire est prêt!</Text>
        <Text style={styles.description}>
          Voici un aperçu de votre configuration. Vous pourrez ajouter du stock après la configuration.
        </Text>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{state.selectedDrinks.length}</Text>
            <Text style={styles.summaryLabel}>Boissons</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{categoriesWithDrinks}</Text>
            <Text style={styles.summaryLabel}>Catégories</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{fmt(totalPotentialValue)}</Text>
            <Text style={styles.summaryLabel}>Valeur/cassier</Text>
          </View>
        </View>

        {/* Drinks by Category */}
        <Text style={styles.sectionTitle}>📦 Vos boissons</Text>

        {Object.entries(drinksByCategory).map(([category, drinks]) => {
          if (drinks.length === 0) return null

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Badge variant="default">{category}</Badge>
                <Text style={styles.categoryCount}>{drinks.length} boisson{drinks.length > 1 ? 's' : ''}</Text>
              </View>

              <View style={styles.drinkGrid}>
                {drinks.map(drink => {
                  const config = state.drinkConfigs.get(drink.name)
                  return (
                    <View key={drink.name} style={styles.drinkItem}>
                      <Text style={styles.drinkName}>{drink.name}</Text>
                      {config && (
                        <View style={styles.drinkDetails}>
                          <Text style={styles.drinkPrice}>{fmt(config.price)}</Text>
                          <Text style={styles.drinkStock}>Stock: 0</Text>
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
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Prochaines étapes</Text>
            <Text style={styles.infoText}>
              Après cette configuration, vous pourrez ajouter du stock à vos boissons depuis l'écran Inventaire.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          onPress={() => navigation.navigate('Tour')}
        >
          Continuer
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  drinkGrid: {
    gap: 8,
  },
  drinkItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  drinkName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  drinkDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drinkPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  drinkStock: {
    fontSize: 13,
    color: '#9ca3af',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
})
