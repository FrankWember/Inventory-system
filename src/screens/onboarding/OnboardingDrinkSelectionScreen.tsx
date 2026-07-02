import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { DrinkCheckboxItem } from '../../components/onboarding/DrinkCheckboxItem'
import { Button } from '../../components/Button'
import { CAMEROONIAN_DRINKS, DrinkTemplate } from '../../data/cameroonianDrinks'
import { Category } from '../../types'
import { COLORS } from '../../utils/helpers'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DrinkSelection'>

const CATEGORIES: Category[] = ['Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']

export default function OnboardingDrinkSelectionScreen({ navigation }: Props) {
  const { state, selectDrinks } = useOnboarding()
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDrinks, setSelectedDrinks] = useState<DrinkTemplate[]>(
    // Pre-select popular drinks
    state.selectedDrinks.length > 0
      ? state.selectedDrinks
      : CAMEROONIAN_DRINKS.filter(d => d.popular)
  )

  // Filter drinks by category and search
  const filteredDrinks = useMemo(() => {
    let drinks = CAMEROONIAN_DRINKS

    // Filter by category
    if (selectedCategory !== 'Tous') {
      drinks = drinks.filter(d => d.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      drinks = drinks.filter(d => d.name.toLowerCase().includes(query))
    }

    return drinks
  }, [selectedCategory, searchQuery])

  const toggleDrink = (drink: DrinkTemplate) => {
    setSelectedDrinks(prev => {
      const isSelected = prev.some(d => d.name === drink.name)
      if (isSelected) {
        return prev.filter(d => d.name !== drink.name)
      } else {
        return [...prev, drink]
      }
    })
  }

  const isDrinkSelected = (drink: DrinkTemplate) => {
    return selectedDrinks.some(d => d.name === drink.name)
  }

  const handleContinue = () => {
    selectDrinks(selectedDrinks)
    navigation.navigate('Customize')
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={2} totalSteps={5} stepTitle="Sélection des boissons" />

      <View style={styles.content}>
        <Text style={styles.title}>Quelles boissons vendez-vous ?</Text>
        <Text style={styles.description}>
          Sélectionnez toutes les boissons de votre inventaire. Les boissons populaires sont déjà
          pré-sélectionnées.
        </Text>

        {/* Counter */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            <Text style={styles.counterNumber}>{selectedDrinks.length}</Text> boisson{selectedDrinks.length > 1 ? 's' : ''} sélectionnée{selectedDrinks.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une boisson..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          <CategoryTab
            label="Tous"
            selected={selectedCategory === 'Tous'}
            onPress={() => setSelectedCategory('Tous')}
          />
          {CATEGORIES.map(category => (
            <CategoryTab
              key={category}
              label={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
            />
          ))}
        </ScrollView>

        {/* Drink List */}
        <ScrollView style={styles.drinkList} showsVerticalScrollIndicator={false}>
          {filteredDrinks.length > 0 ? (
            filteredDrinks.map(drink => (
              <DrinkCheckboxItem
                key={drink.name}
                drink={drink}
                selected={isDrinkSelected(drink)}
                onToggle={() => toggleDrink(drink)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune boisson trouvée</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          onPress={handleContinue}
          disabled={selectedDrinks.length === 0}
        >
          Continuer
        </Button>
      </View>
    </View>
  )
}

interface CategoryTabProps {
  label: string
  selected: boolean
  onPress: () => void
}

function CategoryTab({ label, selected, onPress }: CategoryTabProps) {
  return (
    <TouchableOpacity
      style={[styles.categoryTab, selected && styles.categoryTabSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.categoryTabText, selected && styles.categoryTabTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
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
    marginBottom: 16,
    lineHeight: 22,
  },
  counter: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#374151',
  },
  counterNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  categoryTabs: {
    maxHeight: 40,
    marginBottom: 16,
  },
  categoryTabsContent: {
    gap: 8,
    paddingRight: 24,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryTabSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTabTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  drinkList: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
})
