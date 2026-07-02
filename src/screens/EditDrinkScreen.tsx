import React, { useMemo, useState, useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Drink } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { ScreenHeader } from '../components/ScreenHeader'
import { fmt, fmtNum, ThemeColors } from '../utils/helpers'

const BREAKPOINT = 768

export default function EditDrinkScreen({ route, navigation }: any) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  const [cassierCost, setCassierCost] = useState<string>('')
  const [rackSize, setRackSize] = useState<string>('')
  const [stock, setStock] = useState<string>('')
  const [minStock, setMinStock] = useState<string>('')
  const [price, setPrice] = useState<string>('')

  useEffect(() => {
    loadDrink()
  }, [drinkId])

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
      setRackSize(data.rack_size.toString())
      setStock(data.stock.toString())
      setMinStock(data.min_stock.toString())
      setPrice(data.price.toString())
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

    // Parse all values
    const cassierCostNum = parseInt(cassierCost) || 0
    const rackSizeNum = parseInt(rackSize) || 1
    const stockNum = parseInt(stock) || 0
    const minStockNum = parseInt(minStock) || 0
    const priceNum = parseInt(price) || 0

    // Calculate unit cost from cassier cost
    const costPerUnit = rackSizeNum > 0 ? Math.round(cassierCostNum / rackSizeNum) : 0

    setSaving(true)
    try {
      const { error } = await supabase
        .from('drinks')
        .update({
          stock: stockNum,
          min_stock: minStockNum,
          rack_size: rackSizeNum,
          price: priceNum,
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!drink) return null

  // Calculate cost per unit from cassier cost
  const cassierCostNum = parseInt(cassierCost) || 0
  const rackSizeNum = parseInt(rackSize) || 1
  const priceNum = parseInt(price) || 0
  const costPerUnit = rackSizeNum > 0 ? cassierCostNum / rackSizeNum : 0
  const profitPerUnit = priceNum - costPerUnit
  const margin = priceNum > 0 ? ((profitPerUnit / priceNum) * 100).toFixed(1) : '0'

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
            value={rackSize}
            onChangeText={setRackSize}
            keyboardType="number-pad"
            placeholder="12"
          />

          <Input
            label="Stock actuel (unités)"
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
          />

          <Input
            label="Seuil minimum (unités)"
            value={minStock}
            onChangeText={setMinStock}
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
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder="Ex: 600"
          />

          {cassierCostNum > 0 && priceNum > 0 && rackSizeNum > 0 && (
            <View style={styles.calculationCard}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Coût par unité (COGS)</Text>
                <Text style={styles.calculationValue}>{fmt(costPerUnit)}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Profit par unité</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? colors.emerald : colors.rose }]}>
                  {fmt(profitPerUnit)}
                </Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>Marge bénéficiaire</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? colors.emerald : colors.rose }]}>
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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  drinkName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slateDark,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate,
    backgroundColor: colors.slateLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.slateDark,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  dangerCard: {
    borderColor: colors.rose,
    borderWidth: 1.5,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.rose,
    marginBottom: 6,
  },
  dangerText: {
    fontSize: 13,
    color: colors.slate,
    marginBottom: 16,
  },
  calculationCard: {
    backgroundColor: colors.surface,
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
    color: colors.slate,
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.slateDark,
  },
})
