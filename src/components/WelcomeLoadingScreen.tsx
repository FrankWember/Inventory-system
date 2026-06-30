import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'

interface WelcomeLoadingScreenProps {
  name?: string
  isReturningUser?: boolean
}

// Personalized welcome messages based on time of day
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bon matin'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

// Motivational tips for bar management
const dailyTips = [
  "Suivre votre stock régulièrement vous aide à éviter les ruptures",
  "Les ventes du weekend sont souvent 30% plus élevées",
  "Un inventaire organisé est la clé d'un service rapide",
  "Vos clients apprécient la constance dans la qualité",
  "Les données de vos sessions vous aident à prendre de meilleures décisions",
  "Un bar bien géré commence par un bon suivi",
  "Chaque session clôturée est une opportunité d'analyser vos ventes",
  "La préparation d'aujourd'hui fait le succès de demain",
]

export function WelcomeLoadingScreen({ name, isReturningUser = false }: WelcomeLoadingScreenProps) {
  const { barInfo } = useSettings()
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.9))
  const [slideAnim] = useState(new Animated.Value(30))

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const firstName = name?.split(' ')[0] || 'utilisateur'
  const barName = barInfo?.name || 'votre établissement'
  const greeting = getTimeBasedGreeting()
  const dailyTip = dailyTips[Math.floor(Math.random() * dailyTips.length)]

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        {/* Icon with glass effect */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="bar-chart" size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.welcomeText}>{greeting},</Text>
        <Text style={styles.nameText}>{firstName}</Text>

        {/* Bar info */}
        <View style={styles.barInfoContainer}>
          <Ionicons name="business" size={16} color={COLORS.slate} />
          <Text style={styles.barName}>{barName}</Text>
        </View>

        {/* Daily tip */}
        <View style={styles.tipContainer}>
          <View style={styles.tipIconBox}>
            <Ionicons name="bulb" size={14} color={COLORS.amber} />
          </View>
          <Text style={styles.tipText}>{dailyTip}</Text>
        </View>

        {/* Loading indicator */}
        <View style={styles.loaderContainer}>
          <View style={styles.loaderDot} />
          <View style={[styles.loaderDot, styles.loaderDotDelay1]} />
          <View style={[styles.loaderDot, styles.loaderDotDelay2]} />
        </View>
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
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(74, 144, 226, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.3)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(74, 144, 226, 0.2)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 32,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  barInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    marginBottom: 32,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
      },
    }),
  },
  barName: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.slateDark,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  tipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    lineHeight: 20,
  },
  loaderContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  loaderDotDelay1: {
    opacity: 0.6,
  },
  loaderDotDelay2: {
    opacity: 1,
  },
})
