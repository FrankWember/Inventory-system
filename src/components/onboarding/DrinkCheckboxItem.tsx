import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'
import { Badge } from '../Badge'

type Colors = typeof LIGHT_COLORS

interface DrinkCheckboxItemProps {
  drink: DrinkTemplate
  selected: boolean
  onToggle: () => void
}

export function DrinkCheckboxItem({ drink, selected, onToggle }: DrinkCheckboxItemProps) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <TouchableOpacity
      style={[styles.container, selected && styles.containerSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={15} color={colors.white} />}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
          {drink.name}
        </Text>
        <Badge variant="default">{drink.category}</Badge>
      </View>

      {drink.popular && (
        <Badge variant="info" style={styles.popularBadge}>
          {t('onboarding.drinksPopular')}
        </Badge>
      )}
    </TouchableOpacity>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACE.md,
      backgroundColor: c.card,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: c.border,
      marginBottom: SPACE.sm,
    },
    containerSelected: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.sm,
      borderWidth: 2,
      borderColor: c.borderStrong,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACE.md,
    },
    checkboxSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    content: {
      flex: 1,
      gap: SPACE.xs,
    },
    name: {
      ...TYPE.bodyMedium,
      color: c.inkSoft,
    },
    nameSelected: {
      color: c.primary,
      fontFamily: FONT.semibold,
    },
    popularBadge: {
      marginLeft: SPACE.sm,
    },
  })
}
