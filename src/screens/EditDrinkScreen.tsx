import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Drink } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { COLORS, fmt, fmtNum } from '../utils/helpers'

export default function EditDrinkScreen({ route, navigation }: any) {
  const { drinkId } = route.params
  const [drink, setDrink] = useState<Drink | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [unitMode, setUnitMode] = useState<'units' | 'cassiers'>('units')

  useEffect(() => {
    loadDrink()
  }, [])

  const loadDrink = async () => {
    try {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('id', drinkId)
        .single()

      if (error) throw error
      setDrink(data)
    } catch (error) {
      console.error('Error loading drink:', error)
      Alert.alert('Erreur', 'Erreur lors du chargement de la boisson')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!drink) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('drinks')
        .update({
          stock: drink.stock,
          min_stock: drink.min_stock,
          rack_size: drink.rack_size,
          price: drink.price,
          cost: drink.cost,
        })
        .eq('id', drinkId)

      if (error) throw error

      Alert.alert('Succès', 'Boisson mise à jour')
      navigation.goBack()
    } catch (error) {
      console.error('Error updating drink:', error)
      Alert.alert('Erreur', 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== drink?.name) {
      Alert.alert('Erreur', 'Le nom ne correspond pas')
      return
    }

    try {
      const { error } = await supabase
        .from('drinks')
        .update({ active: false })
        .eq('id', drinkId)

      if (error) throw error

      Alert.alert('Succès', 'Boisson supprimée')
      navigation.goBack()
    } catch (error) {
      console.error('Error deleting drink:', error)
      Alert.alert('Erreur', 'Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.amber} />
      </View>
    )
  }

  if (!drink) return null

  const margin = ((drink.price - drink.cost) / drink.price * 100).toFixed(0)
  const profitPerUnit = drink.price - drink.cost
  const isBeer = drink.category === 'Bière'

  // Helper functions for unit conversion using drink's rack_size
  const getDisplayValue = (units: number, field: 'stock' | 'min_stock'): string => {
    if (!isBeer || unitMode === 'units') {
      return units.toString()
    }
    // Convert units to cassiers using rack_size
    const cassiers = Math.floor(units / drink.rack_size)
    return cassiers.toString()
  }

  const setStockFromDisplay = (displayValue: string, field: 'stock' | 'min_stock') => {
    const numValue = parseInt(displayValue) || 0
    let units = numValue

    if (isBeer && unitMode === 'cassiers') {
      // Convert cassiers to units using rack_size
      units = numValue * drink.rack_size
    }

    setDrink({ ...drink, [field]: units })
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        <Card>
          <Text style={styles.drinkName}>{drink.name}</Text>
          <Text style={styles.categoryBadge}>{drink.category}</Text>

          <Input
            label="Unités par casier"
            value={drink.rack_size.toString()}
            onChangeText={(text) => setDrink({ ...drink, rack_size: parseInt(text) || 1 })}
            keyboardType="number-pad"
            placeholder="12"
          />

          {isBeer && (
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitToggleButton, unitMode === 'units' && styles.unitToggleButtonActive]}
                onPress={() => setUnitMode('units')}
              >
                <Text style={[styles.unitToggleText, unitMode === 'units' && styles.unitToggleTextActive]}>
                  Unités
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitToggleButton, unitMode === 'cassiers' && styles.unitToggleButtonActive]}
                onPress={() => setUnitMode('cassiers')}
              >
                <Text style={[styles.unitToggleText, unitMode === 'cassiers' && styles.unitToggleTextActive]}>
                  Cassiers
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Input
            label={`Stock actuel${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''}`}
            value={getDisplayValue(drink.stock, 'stock')}
            onChangeText={(text) => setStockFromDisplay(text, 'stock')}
            keyboardType="number-pad"
          />

          <Input
            label={`Seuil minimum${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''}`}
            value={getDisplayValue(drink.min_stock, 'min_stock')}
            onChangeText={(text) => setStockFromDisplay(text, 'min_stock')}
            keyboardType="number-pad"
          />
          <Input
            label="Prix de vente (FCFA)"
            value={drink.price.toString()}
            onChangeText={(text) => setDrink({ ...drink, price: parseInt(text) || 0 })}
            keyboardType="number-pad"
          />
          <Input
            label="Coût d'achat (FCFA)"
            value={drink.cost.toString()}
            onChangeText={(text) => setDrink({ ...drink, cost: parseInt(text) || 0 })}
            keyboardType="number-pad"
          />

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Marge: {margin}%</Text>
            <Text style={styles.summaryValue}>{fmt(profitPerUnit)}/unité</Text>
          </View>
        </Card>

        <View style={styles.buttons}>
          <Button onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}>
            Enregistrer
          </Button>
          <Button onPress={() => navigation.goBack()} variant="outline" disabled={saving} style={{ flex: 1 }}>
            Annuler
          </Button>
        </View>

        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Zone de danger</Text>
          <Text style={styles.dangerText}>
            Tapez le nom de la boisson pour confirmer la suppression
          </Text>
          <Input
            placeholder={drink.name}
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            autoCapitalize="characters"
          />
          <Button
            onPress={handleDelete}
            variant="danger"
            disabled={deleteConfirm !== drink.name}
          >
            Supprimer cette boisson
          </Button>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  drinkName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate,
    backgroundColor: COLORS.slateLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.slateLight,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  unitToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  unitToggleButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate,
  },
  unitToggleTextActive: {
    color: COLORS.slateDark,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.slate,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slateDark,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  dangerCard: {
    borderColor: COLORS.rose,
    borderWidth: 1.5,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.rose,
    marginBottom: 6,
  },
  dangerText: {
    fontSize: 13,
    color: COLORS.slate,
    marginBottom: 16,
  },
})
