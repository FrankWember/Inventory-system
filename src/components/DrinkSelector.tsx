import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT } from '../utils/helpers'
import { Category } from '../types'
import { DrinkTemplate, searchDrinks, getDrinksByCategory } from '../data/cameroonianDrinks'

interface DrinkSelectorProps {
  selectedDrink: DrinkTemplate | null
  onSelectDrink: (drink: DrinkTemplate) => void
  categoryFilter?: Category
}

export function DrinkSelector({ selectedDrink, onSelectDrink, categoryFilter }: DrinkSelectorProps) {
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Tout'>('Tout')
  const inputRef = useRef<TextInput>(null)

  const categories: Array<Category | 'Tout'> = [
    'Tout', 'Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre',
  ]

  const filteredDrinks = useMemo(() => {
    if (!searchQuery && !customName) return []

    let drinks = searchDrinks(searchQuery || customName)

    if (categoryFilter) {
      drinks = drinks.filter(d => d.category === categoryFilter)
    } else if (selectedCategory !== 'Tout') {
      drinks = drinks.filter(d => d.category === selectedCategory)
    }

    return drinks.slice(0, 8) // Limit to 8 suggestions
  }, [searchQuery, customName, selectedCategory, categoryFilter])

  const handleSelectDrink = (drink: DrinkTemplate) => {
    onSelectDrink(drink)
    setDropdownVisible(false)
    setSearchQuery('')
    setCustomName(drink.name)
    setSelectedCategory('Tout')
  }

  const handleSelectCustom = () => {
    if (!customName.trim()) return

    // Create a custom drink template
    const customDrink: DrinkTemplate = {
      name: customName.trim(),
      category: selectedCategory === 'Tout' ? 'Autre' : selectedCategory as Category,
      defaultRackSize: 1,
      popular: false,
    }

    onSelectDrink(customDrink)
    setDropdownVisible(false)
    setSearchQuery('')
  }

  const handleInputChange = (text: string) => {
    setCustomName(text)
    setSearchQuery(text)
    if (!dropdownVisible && text.length > 0) {
      setDropdownVisible(true)
    }
  }

  const handleClearSelection = () => {
    setCustomName('')
    setSearchQuery('')
    setDropdownVisible(false)
    if (selectedDrink) {
      onSelectDrink(null as any)
    }
  }

  const renderDrinkItem = ({ item }: { item: DrinkTemplate }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectDrink(item)}
    >
      <View style={styles.suggestionLeft}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionCategory}>{item.category}</Text>
      </View>
      {item.popular && (
        <View style={styles.popularBadge}>
          <Ionicons name="star" size={12} color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Tapez le nom de la boisson..."
          value={customName}
          onChangeText={handleInputChange}
          onFocus={() => customName.length > 0 && setDropdownVisible(true)}
          placeholderTextColor={COLORS.slate}
        />
        {customName.length > 0 && (
          <TouchableOpacity onPress={handleClearSelection} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.slate} />
          </TouchableOpacity>
        )}
        <Ionicons name="search" size={20} color={COLORS.slate} style={styles.searchIcon} />
      </View>

      {selectedDrink && (
        <View style={styles.selectedChip}>
          <Text style={styles.selectedChipText}>{selectedDrink.category}</Text>
        </View>
      )}

      {dropdownVisible && (customName.length > 0) && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.dropdownScroll}
            contentContainerStyle={styles.dropdownContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {!categoryFilter && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {filteredDrinks.length > 0 && (
              <>
                <Text style={styles.dropdownLabel}>Suggestions</Text>
                {filteredDrinks.map((drink, index) => (
                  <View key={`${drink.name}-${index}`}>
                    {renderDrinkItem({ item: drink })}
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity
              style={styles.customOption}
              onPress={handleSelectCustom}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.customOptionText}>
                Ajouter "{customName}"
                {selectedCategory !== 'Tout' && ` (${selectedCategory})`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    zIndex: 1000,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.slateDark,
    marginRight: 8,
  },
  searchIcon: {
    marginLeft: 4,
  },
  clearBtn: {
    padding: 2,
    marginRight: 8,
  },
  selectedChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedChipText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 280,
    overflow: 'hidden',
    zIndex: 9999,
  },
  dropdownScroll: {
    flex: 1,
  },
  dropdownContent: {
    flexGrow: 1,
  },
  categoryScroll: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: COLORS.slate,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  dropdownLabel: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  suggestionLeft: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
  },
  suggestionCategory: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginTop: 2,
  },
  popularBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  customOptionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
  },
})
