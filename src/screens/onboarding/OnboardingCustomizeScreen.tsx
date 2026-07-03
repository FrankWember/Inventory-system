import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding, DrinkConfig } from '../../contexts/OnboardingContext'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { DrinkConfigCard } from '../../components/onboarding/DrinkConfigCard'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { DualStockInput } from '../../components/DualStockInput'
import { DrinkTemplate } from '../../data/cameroonianDrinks'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS, fmt } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Customize'>
type Colors = typeof LIGHT_COLORS

export default function OnboardingCustomizeScreen({ navigation }: Props) {
  const { state, updateDrinkConfig, isAllDrinksConfigured } = useOnboarding()
  const { colors } = useSettings()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isWide = width >= 640

  const [editingDrink, setEditingDrink] = useState<DrinkTemplate | null>(null)
  const [modalConfig, setModalConfig] = useState<Partial<DrinkConfig>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sortedDrinks = useMemo(
    () => [...state.selectedDrinks].sort((a, b) => a.name.localeCompare(b.name)),
    [state.selectedDrinks]
  )

  const configuredCount = state.selectedDrinks.filter(d => {
    const c = state.drinkConfigs.get(d.name)
    return c && c.price > 0 && c.cassierCost > 0 && c.cassierQuantity > 0
  }).length

  const openEditor = (drink: DrinkTemplate) => {
    const existing = state.drinkConfigs.get(drink.name)
    setEditingDrink(drink)
    setModalConfig(existing || { cassierQuantity: drink.defaultRackSize, cassierCost: 0, price: 0, supplier: '', initialStock: 0 })
    setErrors({})
  }

  const closeEditor = () => {
    setEditingDrink(null)
    setModalConfig({})
    setErrors({})
  }

  const validateAndSave = () => {
    if (!editingDrink) return
    const e: Record<string, string> = {}
    if (!modalConfig.cassierQuantity || modalConfig.cassierQuantity <= 0) e.cassierQuantity = t('onboarding.editorErrorQty')
    if (!modalConfig.cassierCost || modalConfig.cassierCost <= 0) e.cassierCost = t('onboarding.editorErrorCost')
    if (!modalConfig.price || modalConfig.price <= 0) e.price = t('onboarding.editorErrorPrice')
    if (Object.keys(e).length > 0) return setErrors(e)

    updateDrinkConfig(editingDrink.name, {
      cassierQuantity: modalConfig.cassierQuantity!,
      cassierCost: modalConfig.cassierCost!,
      price: modalConfig.price!,
      supplier: modalConfig.supplier || '',
      minStock: editingDrink.defaultRackSize,
      initialStock: modalConfig.initialStock || 0,
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
  const showCalc = !!(modalConfig.cassierQuantity && modalConfig.cassierCost && modalConfig.price)

  return (
    <OnboardingLayout
      step={3}
      maxWidth={640}
      title={t('onboarding.customizeTitle')}
      subtitle={t('onboarding.customizeDescription')}
      onBack={() => navigation.goBack()}
      footer={
        <Button
          variant="primary"
          size="large"
          onPress={() => navigation.navigate('StockOverview')}
          disabled={!isAllDrinksConfigured()}
        >
          {t('onboarding.continue')}
        </Button>
      }
    >
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {t('onboarding.customizeProgress', { done: configuredCount, total: state.selectedDrinks.length })}
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {sortedDrinks.map(drink => (
          <DrinkConfigCard
            key={drink.name}
            drink={drink}
            config={state.drinkConfigs.get(drink.name)}
            onPress={() => openEditor(drink)}
          />
        ))}
        <View style={{ height: SPACE.md }} />
      </ScrollView>

      {/* Editor: bottom-sheet on mobile, centered dialog on web */}
      <Modal visible={editingDrink !== null} animationType="fade" transparent onRequestClose={closeEditor}>
        <TouchableWithoutFeedback onPress={closeEditor}>
          <View style={[styles.backdrop, isWide && styles.backdropCentered]}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.sheet, isWide && styles.dialog]}
              >
                {!isWide && <View style={styles.grabber} />}
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>{editingDrink?.name}</Text>
                    <Text style={styles.sheetSubtitle}>{editingDrink?.category}</Text>
                  </View>
                  <TouchableOpacity onPress={closeEditor} style={styles.closeBtn} hitSlop={8}>
                    <Ionicons name="close" size={20} color={colors.slate} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Input
                    label={t('onboarding.editorCassierQtyLabel')}
                    value={modalConfig.cassierQuantity?.toString() || ''}
                    onChangeText={text => {
                      setModalConfig({ ...modalConfig, cassierQuantity: parseInt(text) || 0 })
                      setErrors({ ...errors, cassierQuantity: '' })
                    }}
                    error={errors.cassierQuantity}
                    keyboardType="numeric"
                    placeholder={t('onboarding.editorCassierQtyPlaceholder')}
                  />
                  <Input
                    label={t('onboarding.editorCassierCostLabel')}
                    value={modalConfig.cassierCost?.toString() || ''}
                    onChangeText={text => {
                      setModalConfig({ ...modalConfig, cassierCost: parseInt(text) || 0 })
                      setErrors({ ...errors, cassierCost: '' })
                    }}
                    error={errors.cassierCost}
                    keyboardType="numeric"
                    placeholder={t('onboarding.editorCassierCostPlaceholder')}
                  />
                  <Input
                    label={t('onboarding.editorPriceLabel')}
                    value={modalConfig.price?.toString() || ''}
                    onChangeText={text => {
                      setModalConfig({ ...modalConfig, price: parseInt(text) || 0 })
                      setErrors({ ...errors, price: '' })
                    }}
                    error={errors.price}
                    keyboardType="numeric"
                    placeholder={t('onboarding.editorPricePlaceholder')}
                  />
                  <Input
                    label={t('onboarding.editorSupplierLabel')}
                    value={modalConfig.supplier || ''}
                    onChangeText={text => setModalConfig({ ...modalConfig, supplier: text })}
                    placeholder={t('onboarding.editorSupplierPlaceholder')}
                    autoCapitalize="characters"
                  />
                  <DualStockInput
                    label={t('onboarding.editorInitialStockLabel')}
                    totalUnits={modalConfig.initialStock || 0}
                    cassierQuantity={modalConfig.cassierQuantity || 1}
                    onChange={(totalUnits) => setModalConfig({ ...modalConfig, initialStock: totalUnits })}
                  />

                  {showCalc && (
                    <View style={styles.calc}>
                      <View style={styles.calcHeader}>
                        <Ionicons name="calculator-outline" size={16} color={colors.emerald} />
                        <Text style={styles.calcTitle}>{t('onboarding.editorAutoCalc')}</Text>
                      </View>
                      <CalcRow label={t('onboarding.editorCostPerUnit')} value={fmt(costPerUnit)} styles={styles} />
                      <CalcRow label={t('onboarding.editorProfitPerUnit')} value={fmt(profitPerUnit)} profit styles={styles} />
                      <CalcRow label={t('onboarding.editorMargin')} value={`${marginPercent}%`} profit styles={styles} />
                    </View>
                  )}
                </ScrollView>

                <View style={styles.sheetFooter}>
                  <Button variant="outline" onPress={closeEditor} style={{ flex: 1 }}>
                    {t('onboarding.editorCancel')}
                  </Button>
                  <View style={{ width: SPACE.md }} />
                  <Button variant="primary" onPress={validateAndSave} style={{ flex: 1 }}>
                    {t('onboarding.editorSave')}
                  </Button>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </OnboardingLayout>
  )
}

function CalcRow({
  label,
  value,
  profit,
  styles,
}: {
  label: string
  value: string
  profit?: boolean
  styles: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={styles.calcRow}>
      <Text style={styles.calcLabel}>{label}</Text>
      <Text style={[styles.calcValue, profit && styles.calcProfit]}>{value}</Text>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    progressRow: {
      marginBottom: SPACE.md,
    },
    progressText: {
      ...TYPE.small,
      fontFamily: FONT.semibold,
      color: c.slate,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    list: {
      flex: 1,
    },
    // Editor
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
      justifyContent: 'flex-end',
    },
    backdropCentered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACE.xl,
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      paddingTop: SPACE.md,
      maxHeight: '88%',
    },
    dialog: {
      width: '100%',
      maxWidth: 460,
      borderRadius: RADIUS.xl,
      maxHeight: '86%',
      ...Platform.select({
        web: { boxShadow: '0 20px 60px rgba(15,23,42,0.28)' } as object,
        default: {},
      }),
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: RADIUS.pill,
      backgroundColor: c.borderStrong,
      alignSelf: 'center',
      marginBottom: SPACE.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACE.xl,
      paddingBottom: SPACE.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    sheetTitle: {
      ...TYPE.h2,
      color: c.slateDark,
    },
    sheetSubtitle: {
      ...TYPE.small,
      color: c.slate,
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.pill,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBody: {
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.lg,
    },
    sheetFooter: {
      flexDirection: 'row',
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.md,
      paddingBottom: SPACE['2xl'],
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    calc: {
      marginTop: SPACE.sm,
      marginBottom: SPACE.lg,
      padding: SPACE.lg,
      backgroundColor: c.emeraldLight,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.emerald,
    },
    calcHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginBottom: SPACE.md,
    },
    calcTitle: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.emerald,
    },
    calcRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACE.sm,
    },
    calcLabel: {
      ...TYPE.body,
      color: c.slate,
    },
    calcValue: {
      ...TYPE.bodyMedium,
      fontFamily: FONT.semibold,
      color: c.inkSoft,
      fontVariant: ['tabular-nums'],
    },
    calcProfit: {
      color: c.emerald,
    },
  })
}
