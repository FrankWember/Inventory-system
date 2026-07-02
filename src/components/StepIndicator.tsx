import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { ThemeColors } from '../utils/helpers'

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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotDone: {
    backgroundColor: colors.emerald,
  },
  dotText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.slate,
  },
  dotTextActive: {
    color: colors.white,
  },
  label: {
    fontSize: 10,
    color: colors.slate,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  line: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  lineDone: {
    backgroundColor: colors.emerald,
  },
})
