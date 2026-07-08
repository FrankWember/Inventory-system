import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { Button } from '../../components/Button'
import { Logo } from '../../components/Logo'
import { SimpleBarChart, BarChartItem } from '../../components/SimpleBarChart'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>
type Colors = typeof LIGHT_COLORS

// Sample data for preview charts
const stockPreviewData: BarChartItem[] = [
  { label: 'Bière', value: 45, color: LIGHT_COLORS.primary },
  { label: 'Soda', value: 78, color: LIGHT_COLORS.sky },
  { label: 'Jus', value: 23, color: LIGHT_COLORS.amber },
  { label: 'Eau', value: 12, color: LIGHT_COLORS.emerald },
]

const salesPreviewData: BarChartItem[] = [
  { label: 'Lun', value: 12500, color: LIGHT_COLORS.emerald },
  { label: 'Mar', value: 15800, color: LIGHT_COLORS.emerald },
  { label: 'Mer', value: -2300, color: LIGHT_COLORS.rose },
  { label: 'Jeu', value: 18200, color: LIGHT_COLORS.emerald },
  { label: 'Ven', value: 22400, color: LIGHT_COLORS.emerald },
]

const analyticsPreviewData: BarChartItem[] = [
  { label: 'S1', value: 45000, color: LIGHT_COLORS.primary },
  { label: 'S2', value: 52000, color: LIGHT_COLORS.primary },
  { label: 'S3', value: 48000, color: LIGHT_COLORS.primary },
  { label: 'S4', value: 61000, color: LIGHT_COLORS.emerald },
]

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isWide = width >= 640

  const features: {
    icon: keyof typeof Ionicons.glyphMap
    title: string
    desc: string
    preview: 'stock' | 'sales' | 'analytics' | 'secure'
  }[] = [
    { icon: 'cube-outline', title: t('onboarding.featureStockTitle'), desc: t('onboarding.featureStockDesc'), preview: 'stock' },
    { icon: 'cash-outline', title: t('onboarding.featureSalesTitle'), desc: t('onboarding.featureSalesDesc'), preview: 'sales' },
    { icon: 'trending-up-outline', title: t('onboarding.featureAnalyticsTitle'), desc: t('onboarding.featureAnalyticsDesc'), preview: 'analytics' },
    { icon: 'shield-checkmark-outline', title: t('onboarding.featureSecureTitle'), desc: t('onboarding.featureSecureDesc'), preview: 'secure' },
  ]

  const renderPreview = (type: 'stock' | 'sales' | 'analytics' | 'secure') => {
    switch (type) {
      case 'stock':
        return <SimpleBarChart data={stockPreviewData} height={80} formatValue={(v) => String(v)} />
      case 'sales':
        return <SimpleBarChart data={salesPreviewData} height={80} horizontal formatValue={(v) => String(v)} />
      case 'analytics':
        return <SimpleBarChart data={analyticsPreviewData} height={80} formatValue={(v) => String(v)} />
      case 'secure':
        return (
          <View style={styles.securePreview}>
            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={12} color={colors.emerald} />
              <View style={styles.secureLine} />
            </View>
            <View style={styles.secureRow}>
              <Ionicons name="checkmark-circle" size={12} color={colors.emerald} />
              <View style={styles.secureLine} />
            </View>
            <View style={styles.secureRow}>
              <Ionicons name="shield-checkmark" size={12} color={colors.emerald} />
              <View style={styles.secureLine} />
            </View>
          </View>
        )
    }
  }

  return (
    <OnboardingLayout
      maxWidth={isWide ? 840 : 620}
      footer={
        <Button variant="primary" size="large" onPress={() => navigation.navigate('BarSetup')}>
          {t('onboarding.welcomeStart')}
        </Button>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Logo size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.welcomeSubtitle')}</Text>
          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color={colors.slate} />
            <Text style={styles.timeText}>{t('onboarding.welcomeTimeHint')}</Text>
          </View>
        </View>

        <View style={[styles.grid, isWide && styles.gridWide]}>
          {features.map(f => (
            <View key={f.title} style={[styles.featureCard, isWide && styles.featureCardWide]}>
              <View style={styles.featureHeader}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
              </View>
              <Text style={styles.featureDesc}>{f.desc}</Text>
              <View style={styles.previewContainer}>
                {renderPreview(f.preview)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </OnboardingLayout>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    scroll: {
      paddingBottom: SPACE.xl,
    },
    hero: {
      alignItems: 'center',
      marginBottom: SPACE['3xl'],
    },
    logoWrap: {
      width: 76,
      height: 76,
      borderRadius: RADIUS.xl,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.xl,
      ...Platform.select({
        web: { boxShadow: '0 12px 32px rgba(24,119,242,0.18)' } as object,
        default: {
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
          elevation: 4,
        },
      }),
    },
    title: {
      ...TYPE.display,
      color: c.slateDark,
      textAlign: 'center',
      marginBottom: SPACE.sm,
    },
    subtitle: {
      ...TYPE.body,
      fontFamily: FONT.regular,
      fontSize: 15,
      color: c.slate,
      textAlign: 'center',
      marginBottom: SPACE.lg,
    },
    timePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.xs,
      paddingVertical: SPACE.xs,
      paddingHorizontal: SPACE.md,
      borderRadius: RADIUS.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    timeText: {
      ...TYPE.small,
      fontFamily: FONT.semibold,
      color: c.slate,
    },
    grid: {
      gap: SPACE.lg,
    },
    gridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACE.lg,
    },
    featureCard: {
      backgroundColor: c.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACE.lg,
      overflow: 'hidden',
    },
    featureCardWide: {
      ...Platform.select({
        web: {
          width: 'calc(50% - 8px)', // Account for gap
        } as object,
        default: {
          width: '48%',
        },
      }),
      flexGrow: 0,
      flexShrink: 0,
    },
    featureHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      marginBottom: SPACE.sm,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTitle: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.slateDark,
      flex: 1,
    },
    featureDesc: {
      ...TYPE.body,
      fontSize: 13,
      color: c.slate,
      lineHeight: 18,
      marginBottom: SPACE.md,
    },
    previewContainer: {
      marginTop: SPACE.sm,
      padding: SPACE.sm,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      minHeight: 90,
    },
    securePreview: {
      paddingVertical: SPACE.md,
      gap: SPACE.md,
    },
    secureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
    },
    secureLine: {
      flex: 1,
      height: 4,
      backgroundColor: c.emeraldLight,
      borderRadius: RADIUS.pill,
    },
  })
}
