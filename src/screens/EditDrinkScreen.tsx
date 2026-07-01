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
  Dimensions,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Drink } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { ScreenHeader } from '../components/ScreenHeader'
import { COLORS, fmt, fmtNum } from '../utils/helpers'

const BREAKPOINT = 768

export default function EditDrinkScreen({ route, navigation }: any) {
  const { drinkId, hideHeader } = route.params
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])
  const [drink, setDrink] = useState<Drink | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [unitMode, setUnitMode] = useState<'units' | 'cassiers'>('units')
  const [cassierCost, setCassierCost] = useState<string>('')

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
      // Calculate cassier cost from unit cost and rack size
      const calculatedCassierCost = data.cost * data.rack_size
      setCassierCost(calculatedCassierCost.toString())
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

    // Calculate unit cost from cassier cost
    const cassierCostNum = parseInt(cassierCost) || 0
    const costPerUnit = drink.rack_size > 0 ? Math.round(cassierCostNum / drink.rack_size) : 0

    setSaving(true)
    try {
      const { error } = await supabase
        .from('drinks')
        .update({
          stock: drink.stock,
          min_stock: drink.min_stock,
          rack_size: drink.rack_size,
          price: drink.price,
          cost: costPerUnit,
          cassier_cost: cassierCostNum,
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!drink) return null

  // Calculate cost per unit from cassier cost
  const cassierCostNum = parseInt(cassierCost) || 0
  const costPerUnit = drink.rack_size > 0 ? cassierCostNum / drink.rack_size : 0
  const profitPerUnit = drink.price - costPerUnit
  const margin = drink.price > 0 ? ((profitPerUnit / drink.price) * 100).toFixed(1) : '0'
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

  // Show header with back button unless explicitly hidden (for desktop side panel)
  const showHeader = !hideHeader

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showHeader && (
        <ScreenHeader
          title="Modifier"
          subtitle={drink?.name}
          onBack={() => navigation.goBack()}
        />
      )}
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
            label="Combien coûte le cassier? (FCFA) *"
            value={cassierCost}
            onChangeText={setCassierCost}
            keyboardType="number-pad"
            placeholder="Ex: 6000"
          />

          <Input
            label="Prix de vente par unité (FCFA) *"
            value={drink.price.toString()}
            onChangeText={(text) => setDrink({ ...drink, price: parseInt(text) || 0 })}
            keyboardType="number-pad"
            placeholder="Ex: 600"
          />

          {cassierCostNum > 0 && drink.price > 0 && drink.rack_size > 0 && (
            <View style={styles.calculationCard}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Coût par unité (COGS)</Text>
                <Text style={styles.calculationValue}>{fmt(costPerUnit)}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Profit par unité</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? COLORS.emerald : COLORS.rose }]}>
                  {fmt(profitPerUnit)}
                </Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Marge bénéficiaire</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? COLORS.emerald : COLORS.rose }]}>
                  {margin}%
                </Text>
              </View>
            </View>
          )}
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
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
  calculationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate,
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slateDark,
  },
})
