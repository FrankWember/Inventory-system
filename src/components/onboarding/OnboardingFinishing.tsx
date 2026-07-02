import React, { useEffect, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Platform, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Colors = typeof LIGHT_COLORS

export type FinishStage = 'bar' | 'drinks' | 'wrap' | 'done'

const ORDER: FinishStage[] = ['bar', 'drinks', 'wrap', 'done']

interface OnboardingFinishingProps {
  stage: FinishStage
  drinkCount: number
}

/**
 * Branded, staged loading screen shown while completeOnboarding() runs its
 * real work (update bar → bulk insert drinks → mark complete). Mirrors the
 * quiet Apple-style WelcomeLoadingScreen so the hand-off into the app feels
 * seamless.
 */
export function OnboardingFinishing({ stage, drinkCount }: OnboardingFinishingProps) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(14)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [fade, rise])

  const activeIndex = ORDER.indexOf(stage)
  const isDone = stage === 'done'

  const steps: { key: FinishStage; label: string }[] = [
    { key: 'bar', label: t('onboarding.finishingCreatingBar') },
    { key: 'drinks', label: t('onboarding.finishingAddingDrinks') },
    { key: 'wrap', label: t('onboarding.finishingWrapping') },
  ]

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={[styles.logoWrap, isDone && styles.logoWrapDone]}>
          <Ionicons name={isDone ? 'checkmark' : 'beer'} size={30} color={isDone ? colors.white : colors.primary} />
        </View>

        <Text style={styles.title}>
          {isDone ? t('onboarding.finishingDone') : t('onboarding.tourDoneTitle')}
        </Text>

        <View style={styles.steps}>
          {steps.map((s, i) => {
            const done = isDone || i < activeIndex
            const active = !isDone && i === activeIndex
            return (
              <View key={s.key} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  {done ? (
                    <View style={styles.checkDot}>
                      <Ionicons name="checkmark" size={13} color={colors.white} />
                    </View>
                  ) : active ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>{s.label}</Text>
              </View>
            )
          })}
        </View>
      </Animated.View>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACE['2xl'],
    },
    content: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
    },
    logoWrap: {
      width: 68,
      height: 68,
      borderRadius: RADIUS.xl,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE['3xl'],
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
    logoWrapDone: {
      backgroundColor: c.emerald,
    },
    title: {
      ...TYPE.h1,
      color: c.slateDark,
      textAlign: 'center',
      marginBottom: SPACE['2xl'],
    },
    steps: {
      width: '100%',
      gap: SPACE.lg,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
    },
    stepIcon: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkDot: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.pill,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingDot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.pill,
      borderWidth: 2,
      borderColor: c.border,
    },
    stepLabel: {
      ...TYPE.body,
      fontFamily: FONT.medium,
      color: c.slate400,
      flex: 1,
    },
    stepLabelActive: {
      color: c.slateDark,
      fontFamily: FONT.semibold,
    },
  })
}
