import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT } from '../utils/helpers'

interface WelcomeLoadingScreenProps {
  name?: string
  isReturningUser?: boolean
}

export function WelcomeLoadingScreen({ name, isReturningUser = false }: WelcomeLoadingScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.9))

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const firstName = name?.split(' ')[0] || 'Utilisateur'

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.primary} />
        </View>

        <Text style={styles.welcomeText}>
          {isReturningUser ? 'Bon retour' : 'Bienvenue'}
        </Text>

        {name && (
          <Text style={styles.nameText}>{firstName}</Text>
        )}

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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 17,
    fontFamily: FONT.medium,
    color: COLORS.slate,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  nameText: {
    fontSize: 32,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
