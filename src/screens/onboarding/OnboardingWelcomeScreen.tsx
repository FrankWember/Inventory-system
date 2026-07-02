import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { Button } from '../../components/Button'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>
type Colors = typeof LIGHT_COLORS

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const isWide = width >= 640

  const features: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
    { icon: 'cube-outline', title: t('onboarding.featureStockTitle'), desc: t('onboarding.featureStockDesc') },
    { icon: 'cash-outline', title: t('onboarding.featureSalesTitle'), desc: t('onboarding.featureSalesDesc') },
    { icon: 'trending-up-outline', title: t('onboarding.featureAnalyticsTitle'), desc: t('onboarding.featureAnalyticsDesc') },
    { icon: 'shield-checkmark-outline', title: t('onboarding.featureSecureTitle'), desc: t('onboarding.featureSecureDesc') },
  ]

  return (
    <OnboardingLayout
      maxWidth={620}
      footer={
        <Button variant="primary" size="large" onPress={() => navigation.navigate('BarSetup')}>
          {t('onboarding.welcomeStart')}
        </Button>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Ionicons name="beer" size={34} color={colors.primary} />
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
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
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
      gap: SPACE.md,
    },
    gridWide: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    featureCard: {
      backgroundColor: c.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACE.lg,
    },
    featureCardWide: {
      width: '48%',
      flexGrow: 1,
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.md,
    },
    featureTitle: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.slateDark,
      marginBottom: SPACE.xs,
    },
    featureDesc: {
      ...TYPE.body,
      color: c.slate,
      lineHeight: 20,
    },
  })
}
