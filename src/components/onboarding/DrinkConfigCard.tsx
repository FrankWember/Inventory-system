import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { DrinkConfig } from '../../contexts/OnboardingContext'
import { COLORS, fmt } from '../../utils/helpers'
import { Badge } from '../Badge'

interface DrinkConfigCardProps {
  drink: DrinkTemplate
  config?: DrinkConfig
  onPress: () => void
}

export function DrinkConfigCard({ drink, config, onPress }: DrinkConfigCardProps) {
  const isConfigured = config && config.price > 0 && config.cassierCost > 0 && config.cassierQuantity > 0

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
          <Text style={styles.name}>{drink.name}</Text>
          {isConfigured && (
            <View style={styles.checkIcon}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
          )}
        </View>
        <Badge variant="default">
          {drink.category}
        </Badge>
      </View>

      {isConfigured && config ? (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prix de vente:</Text>
            <Text style={styles.detailValue}>{fmt(config.price)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Coût unitaire:</Text>
            <Text style={styles.detailValue}>{fmt(costPerUnit)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Marge:</Text>
            <Text style={[styles.detailValue, styles.profit]}>
              {fmt(profitPerUnit)} ({marginPercent}%)
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.unconfiguredText}>Appuyez pour configurer</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  containerConfigured: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  profit: {
    color: '#10b981',
  },
  unconfiguredText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 4,
  },
})
