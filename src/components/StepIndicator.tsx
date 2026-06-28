import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS } from '../utils/helpers'

interface Step {
  key: string
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  current: string
  onStepPress?: (key: string) => void
}

export function StepIndicator({ steps, current, onStepPress }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === current)

  return (
    <View style={styles.container}>
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = step.key === current
        const canPress = onStepPress && (done || active)
        const Wrapper = canPress ? TouchableOpacity : View
        return (
          <Wrapper
            key={step.key}
            style={styles.step}
            onPress={canPress ? () => onStepPress(step.key) : undefined}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
              ]}
            >
              <Text style={[styles.dotText, (done || active) && styles.dotTextActive]}>
                {done ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {step.label}
            </Text>
            {i < steps.length - 1 && (
              <View style={[styles.line, done && styles.lineDone]} />
            )}
          </Wrapper>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
  dotDone: {
    backgroundColor: COLORS.emerald,
  },
  dotText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate,
  },
  dotTextActive: {
    color: COLORS.white,
  },
  label: {
    fontSize: 10,
    color: COLORS.slate,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  line: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  lineDone: {
    backgroundColor: COLORS.emerald,
  },
})
