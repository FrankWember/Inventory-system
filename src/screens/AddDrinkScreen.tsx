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
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Category } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { COLORS, fmt, getCategoryColor } from '../utils/helpers'
import { Picker } from '@react-native-picker/picker'

export default function AddDrinkScreen({ navigation }: any) {
  const [saving, setSaving] = useState(false)
  const [unitMode, setUnitMode] = useState<'units' | 'cassiers'>('units')
  const [form, setForm] = useState({
    name: '',
    category: 'Autre' as Category,
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    supplier: '',
    notes: '',
  })

  const categories: Category[] = ['Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']
  const isBeer = form.category === 'Bière'

  // Helper function to convert display value to units
  const getUnitsValue = (displayValue: string): number => {
    const numValue = parseInt(displayValue) || 0
    if (isBeer && unitMode === 'cassiers') {
      return numValue * 12
    }
    return numValue
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('drinks').insert({
        name: form.name.toUpperCase(),
        category: form.category,
        price: parseInt(form.price) || 0,
        cost: parseInt(form.cost) || 0,
        stock: getUnitsValue(form.stock),
        min_stock: getUnitsValue(form.minStock),
        rack_size: 12, // Default rack size (can be edited later)
        supplier: form.supplier,
        notes: form.notes,
        active: true,
      })

      if (error) throw error

      Alert.alert('Succès', 'Boisson ajoutée')
      navigation.goBack()
    } catch (error) {
      console.error('Error adding drink:', error)
      Alert.alert('Erreur', 'Erreur lors de l\'ajout de la boisson')
    } finally {
      setSaving(false)
    }
  }

  const price = parseInt(form.price) || 0
  const cost = parseInt(form.cost) || 0
  const margin = price > 0 ? ((price - cost) / price * 100).toFixed(0) : '0'
  const profitPerUnit = price - cost

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        <Card>
          <Text style={styles.sectionTitle}>Identité</Text>
          <Input
            label="Nom *"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            placeholder="Ex: COCA COLA"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Catégorie *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.category}
              onValueChange={(value) => setForm({ ...form, category: value as Category })}
              style={styles.picker}
            >
              {categories.map(cat => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Tarification</Text>
          <Input
            label="Prix de vente (FCFA) *"
            value={form.price}
            onChangeText={(text) => setForm({ ...form, price: text })}
            keyboardType="number-pad"
            placeholder="0"
          />
          <Input
            label="Coût d'achat (FCFA) *"
            value={form.cost}
            onChangeText={(text) => setForm({ ...form, cost: text })}
            keyboardType="number-pad"
            placeholder="0"
          />

          <View style={styles.marginCard}>
            <Text style={styles.marginText}>
              Marge: {margin}% · Profit/unité: {fmt(profitPerUnit)}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Stock</Text>

          {isBeer && (
            <View style={styles.unitSelector}>
              <Text style={styles.unitSelectorLabel}>Unité de mesure:</Text>
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
              <Text style={styles.unitHint}>
                {unitMode === 'units' ? '1 unité = 1 bouteille' : '1 cassier = 12 bouteilles'}
              </Text>
            </View>
          )}

          <Input
            label={`Stock initial${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''} *`}
            value={form.stock}
            onChangeText={(text) => setForm({ ...form, stock: text })}
            keyboardType="number-pad"
            placeholder="0"
          />
          {isBeer && unitMode === 'cassiers' && form.stock && (
            <Text style={styles.conversionHint}>= {getUnitsValue(form.stock)} unités au total</Text>
          )}

          <Input
            label={`Stock minimum / seuil d'alerte${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''} *`}
            value={form.minStock}
            onChangeText={(text) => setForm({ ...form, minStock: text })}
            keyboardType="number-pad"
            placeholder="0"
          />
          {isBeer && unitMode === 'cassiers' && form.minStock && (
            <Text style={styles.conversionHint}>= {getUnitsValue(form.minStock)} unités au total</Text>
          )}
          <Input
            label="Fournisseur (optionnel)"
            value={form.supplier}
            onChangeText={(text) => setForm({ ...form, supplier: text })}
            placeholder="Ex: Brasseries du Cameroun"
          />
          <Input
            label="Notes (optionnel)"
            value={form.notes}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            placeholder="Ex: Bouteille 1 litre"
          />
        </Card>

        <View style={styles.buttons}>
          <Button
            onPress={handleSave}
            loading={saving}
            disabled={saving}
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
    backgroundColor: COLORS.slateLight,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.slateLight,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  unitSelector: {
    backgroundColor: COLORS.skyLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.sky,
  },
  unitSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  unitToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  unitToggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate,
  },
  unitToggleTextActive: {
    color: COLORS.white,
  },
  unitHint: {
    fontSize: 11,
    color: COLORS.slate,
    fontStyle: 'italic',
  },
  conversionHint: {
    fontSize: 11,
    color: COLORS.sky,
    fontStyle: 'italic',
    marginTop: -12,
    marginBottom: 12,
  },
  marginCard: {
    backgroundColor: COLORS.amberLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.amber,
  },
  marginText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.amberDark,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
})
