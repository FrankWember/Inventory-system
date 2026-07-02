import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { DrinkConfig } from '../../contexts/OnboardingContext'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { DrinkConfigCard } from '../../components/onboarding/DrinkConfigCard'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { COLORS, fmt } from '../../utils/helpers'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Customize'>

export default function OnboardingCustomizeScreen({ navigation }: Props) {
  const { state, updateDrinkConfig, isAllDrinksConfigured } = useOnboarding()
  const [editingDrink, setEditingDrink] = useState<DrinkTemplate | null>(null)
  const [modalConfig, setModalConfig] = useState<Partial<DrinkConfig>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openEditor = (drink: DrinkTemplate) => {
    const existingConfig = state.drinkConfigs.get(drink.name)
    setEditingDrink(drink)
    setModalConfig(existingConfig || {
      cassierQuantity: drink.defaultRackSize,
      cassierCost: 0,
      price: 0,
      supplier: '',
    })
    setErrors({})
  }

  const closeEditor = () => {
    setEditingDrink(null)
    setModalConfig({})
    setErrors({})
  }

  const validateAndSave = () => {
    if (!editingDrink) return

    const newErrors: Record<string, string> = {}

    if (!modalConfig.cassierQuantity || modalConfig.cassierQuantity <= 0) {
      newErrors.cassierQuantity = 'Quantité requise (> 0)'
    }

    if (!modalConfig.cassierCost || modalConfig.cassierCost <= 0) {
      newErrors.cassierCost = 'Coût requis (> 0)'
    }

    if (!modalConfig.price || modalConfig.price <= 0) {
      newErrors.price = 'Prix requis (> 0)'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    updateDrinkConfig(editingDrink.name, {
      cassierQuantity: modalConfig.cassierQuantity!,
      cassierCost: modalConfig.cassierCost!,
      price: modalConfig.price!,
      supplier: modalConfig.supplier || '',
      minStock: editingDrink.defaultRackSize,
      initialStock: 0,
    })

    closeEditor()
  }

  const costPerUnit = modalConfig.cassierQuantity && modalConfig.cassierCost
    ? Math.round(modalConfig.cassierCost / modalConfig.cassierQuantity)
    : 0

  const profitPerUnit = modalConfig.price ? modalConfig.price - costPerUnit : 0
  const marginPercent = modalConfig.price && modalConfig.price > 0
    ? ((profitPerUnit / modalConfig.price) * 100).toFixed(0)
    : '0'

  const handleContinue = () => {
    navigation.navigate('StockOverview')
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={3} totalSteps={5} stepTitle="Configuration des prix" />

      <View style={styles.content}>
        <Text style={styles.title}>Configurez vos boissons</Text>
        <Text style={styles.description}>
          Définissez le prix de vente et le coût d'achat pour chaque boisson.
        </Text>

        <ScrollView style={styles.drinkList} showsVerticalScrollIndicator={false}>
          {state.selectedDrinks.map(drink => (
            <DrinkConfigCard
              key={drink.name}
              drink={drink}
              config={state.drinkConfigs.get(drink.name)}
              onPress={() => openEditor(drink)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          onPress={handleContinue}
          disabled={!isAllDrinksConfigured()}
        >
          Continuer
        </Button>
      </View>

      {/* Editor Modal */}
      <Modal
        visible={editingDrink !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingDrink?.name}</Text>
            <Text style={styles.modalSubtitle}>{editingDrink?.category}</Text>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Input
              label="Unités par caisse/cassier"
              value={modalConfig.cassierQuantity?.toString() || ''}
              onChangeText={text => {
                setModalConfig({ ...modalConfig, cassierQuantity: parseInt(text) || 0 })
                setErrors({ ...errors, cassierQuantity: '' })
              }}
              error={errors.cassierQuantity}
              keyboardType="numeric"
              placeholder="Ex: 12"
            />

            <Input
              label="Coût d'une caisse (FCFA)"
              value={modalConfig.cassierCost?.toString() || ''}
              onChangeText={text => {
                setModalConfig({ ...modalConfig, cassierCost: parseInt(text) || 0 })
                setErrors({ ...errors, cassierCost: '' })
              }}
              error={errors.cassierCost}
              keyboardType="numeric"
              placeholder="Ex: 4800"
            />

            <Input
              label="Prix de vente unitaire (FCFA)"
              value={modalConfig.price?.toString() || ''}
              onChangeText={text => {
                setModalConfig({ ...modalConfig, price: parseInt(text) || 0 })
                setErrors({ ...errors, price: '' })
              }}
              error={errors.price}
              keyboardType="numeric"
              placeholder="Ex: 600"
            />

            <Input
              label="Fournisseur (optionnel)"
              value={modalConfig.supplier || ''}
              onChangeText={text => setModalConfig({ ...modalConfig, supplier: text })}
              placeholder="Ex: SABC"
              autoCapitalize="characters"
            />

            {/* Calculations */}
            {modalConfig.cassierQuantity && modalConfig.cassierCost && modalConfig.price ? (
              <View style={styles.calculations}>
                <Text style={styles.calcTitle}>💰 Calculs automatiques</Text>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Coût unitaire:</Text>
                  <Text style={styles.calcValue}>{fmt(costPerUnit)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Profit par unité:</Text>
                  <Text style={[styles.calcValue, styles.profit]}>{fmt(profitPerUnit)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Marge:</Text>
                  <Text style={[styles.calcValue, styles.profit]}>{marginPercent}%</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button variant="outline" onPress={closeEditor} style={{ flex: 1 }}>
              Annuler
            </Button>
            <View style={{ width: 12 }} />
            <Button variant="primary" onPress={validateAndSave} style={{ flex: 1 }}>
              Enregistrer
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  drinkList: {
    flex: 1,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  calculations: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  profit: {
    color: '#10b981',
  },
})
