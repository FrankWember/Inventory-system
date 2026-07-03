import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native'
import { showAlert } from '../utils/appAlert'
import { useTranslation } from '../i18n'
import { supabase } from '../lib/supabase'
import { Drink } from '../types'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { ScreenHeader } from '../components/ScreenHeader'
import { DualStockInput } from '../components/DualStockInput'
import { fmt, fmtNum } from '../utils/helpers'
import { LIGHT_COLORS } from '../styles/theme'
import { useSettings } from '../contexts/SettingsContext'

const BREAKPOINT = 768

export default function EditDrinkScreen({ route, navigation }: any) {
  const { t } = useTranslation()
  const { colors } = useSettings()
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
  const [stock, setStock] = useState<number>(0)
  const [minStock, setMinStock] = useState<number>(0)
  const [minStockCassiers, setMinStockCassiers] = useState<string>('')
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
      const size = data.cassier_quantity ?? data.rack_size ?? 1
      // Prefer the stored cassier cost; fall back to unit cost × rack size
      const calculatedCassierCost = data.cassier_cost ?? data.cost * size
      setCassierCost(calculatedCassierCost.toString())
      setRackSize(size.toString())
      setStock(data.stock)
      setMinStock(data.min_stock)
      // Calculate cassiers from min_stock units
      const minCassiers = size > 0 ? Math.floor(data.min_stock / size) : 0
      setMinStockCassiers(minCassiers.toString())
      setPrice(data.price.toString())
    } catch (error) {
      console.error('Error loading drink:', error)
      showAlert(t('common.error'), t('inventory.loadDrinkError'))
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleMinStockCassiersChange = (text: string) => {
    setMinStockCassiers(text)
    const cassiers = parseInt(text) || 0
    const rackSizeNum = parseInt(rackSize) || 1
    setMinStock(cassiers * rackSizeNum)
  }

  const handleRackSizeChange = (text: string) => {
    setRackSize(text)
    // Recalculate minStock when rack size changes
    const cassiers = parseInt(minStockCassiers) || 0
    const newRackSize = parseInt(text) || 1
    setMinStock(cassiers * newRackSize)
  }

  const handleSave = async () => {
    if (!drink) return

    // Parse all values
    const cassierCostNum = parseInt(cassierCost) || 0
    const rackSizeNum = parseInt(rackSize) || 1
    const priceNum = parseInt(price) || 0

    // Calculate unit cost from cassier cost
    const costPerUnit = rackSizeNum > 0 ? Math.round(cassierCostNum / rackSizeNum) : 0

    setSaving(true)
    try {
      const { error } = await supabase
        .from('drinks')
        .update({
          stock: stock,
          min_stock: minStock,
          rack_size: rackSizeNum,
          cassier_quantity: rackSizeNum,
          price: priceNum,
          cost: costPerUnit,
          cassier_cost: cassierCostNum,
        })
        .eq('id', drinkId)

      if (error) throw error

      showAlert(t('common.success'), t('inventory.drinkUpdated'))
      navigation.goBack()
    } catch (error) {
      console.error('Error updating drink:', error)
      showAlert(t('common.error'), t('inventory.updateError'))
    } finally {
      setSaving(false)
    }
  }

  // Case/whitespace-insensitive: mobile keyboards capitalize and users add
  // trailing spaces — that must not block a deliberate deletion.
  const deleteConfirmMatches = !!drink && deleteConfirm.trim().toLowerCase() === drink.name.trim().toLowerCase()

  const handleDelete = async () => {
    if (!deleteConfirmMatches) {
      showAlert(t('common.error'), t('inventory.nameMismatch'))
      return
    }

    try {
      const { error } = await supabase
        .from('drinks')
        .update({ active: false })
        .eq('id', drinkId)

      if (error) throw error

      showAlert(t('common.success'), t('inventory.drinkDeleted'))
      navigation.goBack()
    } catch (error) {
      console.error('Error deleting drink:', error)
      showAlert(t('common.error'), t('inventory.deleteError'))
    }
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
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
          title={t('common.edit')}
          subtitle={drink?.name}
          onBack={() => navigation.goBack()}
          colors={colors}
        />
      )}
      <ScrollView style={[styles.container, { backgroundColor: colors.surface }]} contentContainerStyle={styles.scrollContent}>
        <Card>
          <Text style={[styles.drinkName, { color: colors.slateDark }]}>{drink.name}</Text>
          <Text style={[styles.categoryBadge, { color: colors.slate, backgroundColor: colors.slateLight }]}>{drink.category}</Text>

          <Input
            label={t('inventory.unitsPerRack')}
            value={rackSize}
            onChangeText={handleRackSizeChange}
            keyboardType="number-pad"
            placeholder="12"
          />

          <DualStockInput
            label={t('inventory.currentStock')}
            totalUnits={stock}
            cassierQuantity={parseInt(rackSize) || 1}
            onChange={setStock}
          />

          <Input
            label={t('inventory.minThreshold') + ' (' + t('inventory.cratesLower') + ')'}
            value={minStockCassiers}
            onChangeText={handleMinStockCassiersChange}
            keyboardType="number-pad"
            placeholder="0"
          />
          <Input
            label={t('inventory.crateCostQuestion')}
            value={cassierCost}
            onChangeText={setCassierCost}
            keyboardType="number-pad"
            placeholder="Ex: 6000"
          />

          <Input
            label={t('inventory.pricePerUnit')}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder="Ex: 600"
          />

          {cassierCostNum > 0 && priceNum > 0 && rackSizeNum > 0 && (
            <View style={[styles.calculationCard, { backgroundColor: colors.surface }]}>
              <View style={styles.calculationRow}>
                <Text style={[styles.calculationLabel, { color: colors.slate }]}>{t('inventory.costPerUnit')}</Text>
                <Text style={[styles.calculationValue, { color: colors.slateDark }]}>{fmt(costPerUnit)}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={[styles.calculationLabel, { color: colors.slate }]}>{t('inventory.profitPerUnit')}</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? colors.emerald : colors.rose }]}>
                  {fmt(profitPerUnit)}
                </Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={[styles.calculationLabel, { color: colors.slate }]}>{t('inventory.margin')}</Text>
                <Text style={[styles.calculationValue, { color: profitPerUnit > 0 ? colors.emerald : colors.rose }]}>
                  {margin}%
                </Text>
              </View>
            </View>
          )}
        </Card>

        <View style={styles.buttons}>
          <Button onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}>
            {t('common.save')}
          </Button>
          <Button onPress={() => navigation.goBack()} variant="outline" disabled={saving} style={{ flex: 1 }}>
            {t('common.cancel')}
          </Button>
        </View>

        <View style={[styles.dangerCard, { borderColor: colors.rose }]}>
          <Card>
            <Text style={[styles.dangerTitle, { color: colors.rose }]}>{t('inventory.dangerZone')}</Text>
            <Text style={[styles.dangerText, { color: colors.slate }]}>
              {t('inventory.deleteConfirmHint')}
            </Text>
          <Input
            placeholder={drink.name}
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            autoCapitalize="none"
            autoCorrect={false}
          />
            <Button
              onPress={handleDelete}
              variant="danger"
              disabled={!deleteConfirmMatches}
            >
              {t('inventory.deleteThisDrink')}
            </Button>
          </Card>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drinkName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  dangerCard: {
    borderWidth: 1.5,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  dangerText: {
    fontSize: 13,
    marginBottom: 16,
  },
  calculationCard: {
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
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
  },
})
