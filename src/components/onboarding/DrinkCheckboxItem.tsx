import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { COLORS } from '../../utils/helpers'
import { Badge } from '../Badge'

interface DrinkCheckboxItemProps {
  drink: DrinkTemplate
  selected: boolean
  onToggle: () => void
}

export function DrinkCheckboxItem({ drink, selected, onToggle }: DrinkCheckboxItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.containerSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <View style={styles.checkmark} />}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, selected && styles.nameSelected]}>
            {drink.name}
          </Text>
          {drink.popular && (
            <Badge variant="info" style={styles.popularBadge}>
              Populaire
            </Badge>
          )}
        </View>
        <Badge variant="default">
          {drink.category}
        </Badge>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  containerSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  nameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  popularBadge: {
    marginLeft: 'auto',
  },
})
