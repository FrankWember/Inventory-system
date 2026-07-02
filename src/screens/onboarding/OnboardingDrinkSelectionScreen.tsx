import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { DrinkCheckboxItem } from '../../components/onboarding/DrinkCheckboxItem'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Skeleton'
import { CAMEROONIAN_DRINKS, DrinkTemplate } from '../../data/cameroonianDrinks'
import { Category } from '../../types'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DrinkSelection'>
type Colors = typeof LIGHT_COLORS

const CATEGORIES: Category[] = ['Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']

export default function OnboardingDrinkSelectionScreen({ navigation }: Props) {
  const { state, selectDrinks } = useOnboarding()
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tous'>('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [ready, setReady] = useState(false)
  const [selectedDrinks, setSelectedDrinks] = useState<DrinkTemplate[]>(
    state.selectedDrinks.length > 0 ? state.selectedDrinks : CAMEROONIAN_DRINKS.filter(d => d.popular)
  )

  // Brief skeleton so the catalog reveals smoothly after the slide-in animation.
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 350)
    return () => clearTimeout(timer)
  }, [])

  const filteredDrinks = useMemo(() => {
    let drinks = CAMEROONIAN_DRINKS
    if (selectedCategory !== 'Tous') drinks = drinks.filter(d => d.category === selectedCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      drinks = drinks.filter(d => d.name.toLowerCase().includes(q))
    }
    return drinks
  }, [selectedCategory, searchQuery])

  const toggleDrink = (drink: DrinkTemplate) => {
    setSelectedDrinks(prev =>
      prev.some(d => d.name === drink.name)
        ? prev.filter(d => d.name !== drink.name)
        : [...prev, drink]
    )
  }

  const handleContinue = () => {
    selectDrinks(selectedDrinks)
    navigation.navigate('Customize')
  }

  const count = selectedDrinks.length
  const countLabel = count === 1
    ? t('onboarding.drinksSelectedOne', { count })
    : t('onboarding.drinksSelectedMany', { count })

  return (
    <OnboardingLayout
      step={2}
      maxWidth={640}
      title={t('onboarding.drinksTitle')}
      subtitle={t('onboarding.drinksDescription')}
      onBack={() => navigation.goBack()}
      footer={
        <Button variant="primary" size="large" onPress={handleContinue} disabled={count === 0}>
          {t('onboarding.continue')}
        </Button>
      }
    >
      {/* Counter */}
      <View style={styles.counter}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        <Text style={styles.counterText}>{countLabel}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.slate400} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('onboarding.drinksSearchPlaceholder')}
          placeholderTextColor={colors.slate400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.slate400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        <CategoryChip
          label={t('onboarding.drinksCategoryAll')}
          selected={selectedCategory === 'Tous'}
          onPress={() => setSelectedCategory('Tous')}
          styles={styles}
        />
        {CATEGORIES.map(cat => (
          <CategoryChip
            key={cat}
            label={cat}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            styles={styles}
          />
        ))}
      </ScrollView>

      {/* List */}
      {!ready ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={styles.skeletonRow} />
          ))}
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredDrinks.length > 0 ? (
            filteredDrinks.map(drink => (
              <DrinkCheckboxItem
                key={drink.name}
                drink={drink}
                selected={selectedDrinks.some(d => d.name === drink.name)}
                onToggle={() => toggleDrink(drink)}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={32} color={colors.slate400} />
              <Text style={styles.emptyText}>{t('onboarding.drinksEmpty')}</Text>
            </View>
          )}
          <View style={{ height: SPACE.md }} />
        </ScrollView>
      )}
    </OnboardingLayout>
  )
}

function CategoryChip({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string
  selected: boolean
  onPress: () => void
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    counter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      alignSelf: 'flex-start',
      paddingVertical: SPACE.sm,
      paddingHorizontal: SPACE.md,
      backgroundColor: c.primaryLight,
      borderRadius: RADIUS.pill,
      marginBottom: SPACE.md,
    },
    counterText: {
      ...TYPE.bodyMedium,
      fontFamily: FONT.semibold,
      color: c.primary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      height: 46,
      backgroundColor: c.card,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: c.border,
      paddingHorizontal: SPACE.md,
      marginBottom: SPACE.md,
    },
    searchInput: {
      flex: 1,
      ...TYPE.bodyMedium,
      color: c.slateDark,
      ...({ outlineStyle: 'none' } as object),
    },
    chips: {
      maxHeight: 40,
      marginBottom: SPACE.md,
      flexGrow: 0,
    },
    chipsContent: {
      gap: SPACE.sm,
      paddingRight: SPACE.xl,
    },
    chip: {
      paddingHorizontal: SPACE.lg,
      paddingVertical: SPACE.sm,
      borderRadius: RADIUS.pill,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.border,
      height: 36,
      justifyContent: 'center',
    },
    chipSelected: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      ...TYPE.small,
      fontFamily: FONT.semibold,
      color: c.slate,
    },
    chipTextSelected: {
      color: c.white,
    },
    list: {
      flex: 1,
    },
    skeletonList: {
      flex: 1,
      gap: SPACE.sm,
    },
    skeletonRow: {
      height: 60,
      borderRadius: RADIUS.md,
    },
    empty: {
      paddingVertical: SPACE['4xl'],
      alignItems: 'center',
      gap: SPACE.md,
    },
    emptyText: {
      ...TYPE.body,
      color: c.slate400,
    },
  })
}
