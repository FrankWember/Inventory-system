import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../utils/helpers'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  stepTitle?: string
}

export function OnboardingProgress({ currentStep, totalSteps, stepTitle }: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>
        Étape {currentStep} sur {totalSteps}
      </Text>
      {stepTitle && <Text style={styles.stepTitle}>{stepTitle}</Text>}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
})
