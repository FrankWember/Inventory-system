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
import { ScreenHeader } from '../components/ScreenHeader'
import { COLORS, fmt, fmtNum, getCategoryColor } from '../utils/helpers'

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
    rackSize: '12',
    supplier: '',
    notes: '',
  })

  const categories: Category[] = ['Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre']
  const isBeer = form.category === 'Bière'

  // Helper function to convert display value to units
  const getUnitsValue = (displayValue: string): number => {
    const numValue = parseInt(displayValue) || 0
    if (isBeer && unitMode === 'cassiers') {
      const rackSize = parseInt(form.rackSize) || 12
      return numValue * rackSize
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
        rack_size: parseInt(form.rackSize) || 12,
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
      <ScreenHeader
        title="Ajouter une boisson"
        onBack={() => navigation.goBack()}
      />
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
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setForm({ ...form, category: cat })}
                style={[
                  styles.categoryButton,
                  form.category === cat && styles.categoryButtonActive
                ]}
              >
                <Text style={[
                  styles.categoryButtonText,
                  form.category === cat && styles.categoryButtonTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
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

          {price > 0 && cost > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>Marge: {margin}%</Text>
              <Text style={styles.summaryValue}>{fmt(profitPerUnit)}/unité</Text>
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Configuration du stock</Text>

          <Input
            label="Unités par casier"
            value={form.rackSize}
            onChangeText={(text) => setForm({ ...form, rackSize: text })}
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
            label={`Stock initial${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''}`}
            value={form.stock}
            onChangeText={(text) => setForm({ ...form, stock: text })}
            keyboardType="number-pad"
            placeholder="0"
          />

          <Input
            label={`Seuil minimum${isBeer ? ` (${unitMode === 'units' ? 'unités' : 'cassiers'})` : ''}`}
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
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.slateDark,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slateDark,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 90,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate,
  },
  categoryButtonTextActive: {
    color: COLORS.white,
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
})
