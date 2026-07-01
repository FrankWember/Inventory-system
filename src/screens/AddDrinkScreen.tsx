import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Category } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { ScreenHeader } from '../components/ScreenHeader'
import { DrinkSelector } from '../components/DrinkSelector'
import { DrinkTemplate } from '../data/cameroonianDrinks'
import { COLORS, fmt, fmtNum, getCategoryColor } from '../utils/helpers'

const BREAKPOINT = 768

export default function AddDrinkScreen({ navigation, route }: any) {
  const hideHeader = route?.params?.hideHeader
  const [saving, setSaving] = useState(false)
  const [unitMode, setUnitMode] = useState<'units' | 'cassiers'>('cassiers')
  const [selectedDrink, setSelectedDrink] = useState<DrinkTemplate | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [form, setForm] = useState({
    cassierQuantity: '',
    cassierCost: '',
    price: '',
    stock: '',
    minStock: '',
    supplier: '',
  })

  const windowWidth = Dimensions.get('window').width
  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT
  const isMobile = Platform.OS !== 'web'

  const isBeer = selectedDrink?.category === 'Bière'

  // Auto-calculate COGS (cost per unit)
  const cassierQuantity = parseInt(form.cassierQuantity) || 0
  const cassierCost = parseInt(form.cassierCost) || 0
  const costPerUnit = cassierQuantity > 0 ? cassierCost / cassierQuantity : 0

  // Auto-calculate profit per unit
  const sellingPrice = parseInt(form.price) || 0
  const profitPerUnit = sellingPrice - costPerUnit
  const marginPercent = sellingPrice > 0 ? ((profitPerUnit / sellingPrice) * 100).toFixed(1) : '0'

  // Helper function to convert display value to units
  const getUnitsValue = (displayValue: string): number => {
    const numValue = parseInt(displayValue) || 0
    if (unitMode === 'cassiers') {
      return numValue * cassierQuantity
    }
    return numValue
  }

  const handleDrinkSelect = (drink: DrinkTemplate) => {
    setSelectedDrink(drink)
    setForm(prev => ({
      ...prev,
      cassierQuantity: drink.defaultRackSize.toString(),
    }))
  }

  const handleSave = async () => {
    if (!selectedDrink) {
      Alert.alert('Erreur', 'Veuillez sélectionner une boisson')
      return
    }

    if (!form.cassierQuantity || cassierQuantity === 0) {
      Alert.alert('Erreur', 'Veuillez entrer le nombre d\'unités par cassier')
      return
    }

    if (!form.cassierCost || cassierCost === 0) {
      Alert.alert('Erreur', 'Veuillez entrer le coût du cassier')
      return
    }

    if (!form.price || sellingPrice === 0) {
      Alert.alert('Erreur', 'Veuillez entrer le prix de vente')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('drinks').insert({
        name: selectedDrink.name,
        category: selectedDrink.category,
        price: sellingPrice,
        cost: Math.round(costPerUnit),
        stock: getUnitsValue(form.stock),
        min_stock: getUnitsValue(form.minStock),
        rack_size: cassierQuantity,
        cassier_quantity: cassierQuantity,
        cassier_cost: cassierCost,
        supplier: form.supplier,
        notes: '',
        active: true,
      })

      if (error) throw error

      Alert.alert('Succès', 'Boisson ajoutée avec succès!')
      navigation.goBack()
    } catch (error) {
      console.error('Error adding drink:', error)
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la boisson')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      {!hideHeader && (
        <ScreenHeader
          title="Ajouter une boisson"
          subtitle="Sélectionnez et configurez"
          onBack={() => navigation.goBack()}
        />
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.containerDesktop]}
        >
        <Card>
          <Text style={styles.sectionTitle}>Boisson</Text>
          <Text style={styles.label}>Choisir une boisson *</Text>
          <DrinkSelector
            selectedDrink={selectedDrink}
            onSelectDrink={handleDrinkSelect}
            onDropdownChange={setDropdownOpen}
          />
        </Card>

        {selectedDrink && (
          <>
            <Card>
              <Text style={styles.sectionTitle}>Tarification par cassier</Text>
              <Text style={styles.helpText}>
                Entrez les informations du cassier pour calculer automatiquement vos coûts et profits
              </Text>

              <Input
                label="Combien d'unités dans un cassier? *"
                value={form.cassierQuantity}
                onChangeText={(text) => setForm({ ...form, cassierQuantity: text })}
                keyboardType="number-pad"
                placeholder="Ex: 12, 24"
              />

              <Input
                label="Combien coûte le cassier? (FCFA) *"
                value={form.cassierCost}
                onChangeText={(text) => setForm({ ...form, cassierCost: text })}
                keyboardType="number-pad"
                placeholder="Ex: 6000"
              />

              <Input
                label="Prix de vente par unité (FCFA) *"
                value={form.price}
                onChangeText={(text) => setForm({ ...form, price: text })}
                keyboardType="number-pad"
                placeholder="Ex: 600"
              />

              {cassierQuantity > 0 && cassierCost > 0 && sellingPrice > 0 && (
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
                      {marginPercent}%
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>Stock initial</Text>

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

              <Input
                label={`Stock initial (${unitMode === 'units' ? 'unités' : 'cassiers'})`}
                value={form.stock}
                onChangeText={(text) => setForm({ ...form, stock: text })}
                keyboardType="number-pad"
                placeholder="0"
              />

              <Input
                label={`Seuil d'alerte (${unitMode === 'units' ? 'unités' : 'cassiers'})`}
                value={form.minStock}
                onChangeText={(text) => setForm({ ...form, minStock: text })}
                keyboardType="number-pad"
                placeholder="0"
              />

              <Input
                label="Fournisseur (optionnel)"
                value={form.supplier}
                onChangeText={(text) => setForm({ ...form, supplier: text })}
                placeholder="Ex: Brasseries du Cameroun"
              />
            </Card>
          </>
        )}

        {/* Add spacing when dropdown is open to prevent button overlap */}
        {dropdownOpen && <View style={{ height: 320 }} />}

        <View style={styles.buttons}>
          <Button
            onPress={handleSave}
            loading={saving}
            disabled={saving || !selectedDrink}
            style={{ flex: 1 }}
          >
            Enregistrer
          </Button>
          <Button
            onPress={() => navigation.goBack()}
            variant="outline"
            disabled={saving}
            style={{ flex: 1 }}
          >
            Annuler
          </Button>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.slate,
    marginBottom: 20,
    lineHeight: 18,
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
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  containerDesktop: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
})
