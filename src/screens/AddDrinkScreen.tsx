import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { showAlert } from '../utils/appAlert'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { ScreenHeader } from '../components/ScreenHeader'
import { DrinkSelector } from '../components/DrinkSelector'
import { DrinkTemplate } from '../data/cameroonianDrinks'
import { COLORS, fmt } from '../utils/helpers'
import { useTranslation } from '../i18n'

const BREAKPOINT = 768

export default function AddDrinkScreen({ navigation, route }: any) {
  const { t } = useTranslation()
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

  const handleDrinkSelect = async (drink: DrinkTemplate) => {
    // Check if this drink already exists in the database
    try {
      const { data: existingDrinks, error } = await supabase
        .from('drinks')
        .select('id')
        .eq('name', drink.name)
        .eq('active', true)
        .limit(1)

      if (error) throw error

      if (existingDrinks && existingDrinks.length > 0) {
        // Drink already exists - navigate to edit mode
        showAlert(
          t('inventory.drinkExistsTitle'),
          t('inventory.drinkExistsMessage'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel'
            },
            {
              text: t('common.edit'),
              onPress: () => {
                // Use switchToEdit if available (for embedded mode in InventoryScreen)
                if (navigation.switchToEdit) {
                  navigation.switchToEdit(existingDrinks[0].id)
                } else {
                  // Fallback to regular navigation
                  navigation.navigate('EditDrink', { drinkId: existingDrinks[0].id })
                }
              }
            }
          ]
        )
        return
      }
    } catch (error) {
      console.error('Error checking existing drink:', error)
    }

    // Drink doesn't exist - proceed with adding
    setSelectedDrink(drink)
    setForm(prev => ({
      ...prev,
      cassierQuantity: drink.defaultRackSize.toString(),
    }))
  }

  const handleSave = async () => {
    if (!selectedDrink) {
      showAlert(t('common.error'), t('inventory.errSelectDrink'))
      return
    }

    if (!form.cassierQuantity || cassierQuantity === 0) {
      showAlert(t('common.error'), t('inventory.errUnitsPerCrate'))
      return
    }

    if (!form.cassierCost || cassierCost === 0) {
      showAlert(t('common.error'), t('inventory.errCrateCost'))
      return
    }

    if (!form.price || sellingPrice === 0) {
      showAlert(t('common.error'), t('inventory.errPrice'))
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
        supplier: form.supplier || '',
        notes: '',
        active: true,
      })

      if (error) throw error

      showAlert(t('common.success'), t('inventory.drinkAdded'))
      navigation.goBack()
    } catch (error: any) {
      console.error('Error adding drink:', error)
      showAlert(t('common.error'), t('inventory.addDrinkError', { error: error.message || String(error) }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      {!hideHeader && (
        <ScreenHeader
          title={t('inventory.addDrink')}
          subtitle={t('inventory.addSubtitle')}
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
        <Card style={{ overflow: 'visible', zIndex: 1000 }}>
          <Text style={styles.sectionTitle}>{t('inventory.drinkSection')}</Text>
          <Text style={styles.label}>{t('inventory.chooseDrink')}</Text>
          <DrinkSelector
            selectedDrink={selectedDrink}
            onSelectDrink={handleDrinkSelect}
            onDropdownChange={setDropdownOpen}
          />
        </Card>

        {selectedDrink && (
          <>
            <Card>
              <Text style={styles.sectionTitle}>{t('inventory.pricingSection')}</Text>
              <Text style={styles.helpText}>
                {t('inventory.pricingHelp')}
              </Text>

              <Input
                label={t('inventory.unitsPerCrateQuestion')}
                value={form.cassierQuantity}
                onChangeText={(text) => setForm({ ...form, cassierQuantity: text })}
                keyboardType="number-pad"
                placeholder={t('inventory.exampleUnitsPerCrate')}
              />

              <Input
                label={t('inventory.crateCostQuestion')}
                value={form.cassierCost}
                onChangeText={(text) => setForm({ ...form, cassierCost: text })}
                keyboardType="number-pad"
                placeholder={t('inventory.exampleCrateCost')}
              />

              <Input
                label={t('inventory.pricePerUnit')}
                value={form.price}
                onChangeText={(text) => setForm({ ...form, price: text })}
                keyboardType="number-pad"
                placeholder={t('inventory.examplePrice')}
              />

              {cassierQuantity > 0 && cassierCost > 0 && sellingPrice > 0 && (
                <View style={styles.calculationCard}>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>{t('inventory.costPerUnit')}</Text>
                    <Text style={styles.calculationValue}>{fmt(costPerUnit)}</Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>{t('inventory.profitPerUnit')}</Text>
                    <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? COLORS.emerald : COLORS.rose }]}>
                      {fmt(profitPerUnit)}
                    </Text>
                  </View>
                  <View style={styles.calculationRow}>
                    <Text style={styles.calculationLabel}>{t('inventory.margin')}</Text>
                    <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? COLORS.emerald : COLORS.rose }]}>
                      {marginPercent}%
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            <Card>
              <Text style={styles.sectionTitle}>{t('inventory.initialStockSection')}</Text>

              {/* @ts-ignore - web-only className */}
              <View style={styles.unitToggle} className="glass-toggle">
                <TouchableOpacity
                  style={[styles.unitToggleButton, unitMode === 'units' && styles.unitToggleButtonActive]}
                  onPress={() => setUnitMode('units')}
                >
                  <Text style={[styles.unitToggleText, unitMode === 'units' && styles.unitToggleTextActive]}>
                    {t('inventory.unitsToggle')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitToggleButton, unitMode === 'cassiers' && styles.unitToggleButtonActive]}
                  onPress={() => setUnitMode('cassiers')}
                >
                  <Text style={[styles.unitToggleText, unitMode === 'cassiers' && styles.unitToggleTextActive]}>
                    {t('inventory.cratesToggle')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label={t('inventory.initialStockLabel', { unit: unitMode === 'units' ? t('inventory.unitsLower') : t('inventory.cratesLower') })}
                value={form.stock}
                onChangeText={(text) => setForm({ ...form, stock: text })}
                keyboardType="number-pad"
                placeholder="0"
              />

              <Input
                label={t('inventory.alertThresholdLabel', { unit: unitMode === 'units' ? t('inventory.unitsLower') : t('inventory.cratesLower') })}
                value={form.minStock}
                onChangeText={(text) => setForm({ ...form, minStock: text })}
                keyboardType="number-pad"
                placeholder="0"
              />

              <Input
                label={t('inventory.supplierOptional')}
                value={form.supplier}
                onChangeText={(text) => setForm({ ...form, supplier: text })}
                placeholder={t('inventory.exampleSupplier')}
              />
            </Card>
          </>
        )}

          {/* Add spacing when dropdown is open to prevent button overlap */}
          {dropdownOpen && <View style={{ height: 320 }} />}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <View style={styles.buttons}>
            <Button
              onPress={handleSave}
              loading={saving}
              disabled={saving || !selectedDrink}
              style={{ flex: 1 }}
            >
              {t('common.save')}
            </Button>
            <Button
              onPress={() => navigation.goBack()}
              variant="outline"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {t('common.cancel')}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  buttonContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
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
