import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'

interface WelcomeLoadingScreenProps {
  name?: string
  isReturningUser?: boolean
}

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'misc.greetingMorning'
  if (hour < 18) return 'misc.greetingAfternoon'
  return 'misc.greetingEvening'
}

// Apple-style welcome: a quiet screen, one large greeting that settles into
// place, and a soft progress shimmer. No cards, no clutter.
export function WelcomeLoadingScreen({ name }: WelcomeLoadingScreenProps) {
  const { barInfo } = useSettings()
  const { t } = useTranslation()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const riseAnim = useRef(new Animated.Value(16)).current
  const barFade = useRef(new Animated.Value(0)).current
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(riseAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(barFade, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const firstName = name?.split(' ')[0] || ''
  const greeting = t(getTimeBasedGreeting())

  const shimmerX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-72, 72],
  })

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: riseAnim }] }]}
      >
        <View style={styles.logoWrap}>
          <Ionicons name="beer" size={30} color={COLORS.primary} />
        </View>

        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name} numberOfLines={1}>
          {firstName || t('misc.welcomeFallback')}
        </Text>

        {barInfo?.name ? (
          <Animated.Text style={[styles.barName, { opacity: barFade }]}>
            {barInfo.name}
          </Animated.Text>
        ) : null}
      </Animated.View>

      {/* Thin indeterminate progress line, Apple-style */}
      <Animated.View style={[styles.progressTrack, { opacity: barFade }]}>
        <Animated.View style={[styles.progressGlow, { transform: [{ translateX: shimmerX }] }]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    marginBottom: 48,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 12px 32px rgba(24, 119, 242, 0.18), 0 1px 0 rgba(255,255,255,0.6) inset',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  greeting: {
    fontSize: 22,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    marginBottom: 2,
  },
  name: {
    fontSize: 40,
    fontFamily: FONT.extrabold,
    color: COLORS.slateDark,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 14,
  },
  barName: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.slate,
    letterSpacing: 0.2,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 72,
    width: 144,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressGlow: {
    width: 72,
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
})
