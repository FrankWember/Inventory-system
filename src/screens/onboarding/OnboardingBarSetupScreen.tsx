import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BarSetup'>

export default function OnboardingBarSetupScreen({ navigation }: Props) {
  const { state, setBarName } = useOnboarding()
  const [barNameInput, setBarNameInput] = useState(state.barName)
  const [error, setError] = useState('')

  const handleContinue = () => {
    const trimmed = barNameInput.trim()

    if (!trimmed) {
      setError('Le nom du bar est requis')
      return
    }

    if (trimmed.length < 2) {
      setError('Le nom doit contenir au moins 2 caractères')
      return
    }

    if (trimmed.length > 50) {
      setError('Le nom ne peut pas dépasser 50 caractères')
      return
    }

    setBarName(trimmed)
    navigation.navigate('DrinkSelection')
  }

  return (
    <View style={styles.container}>
      <OnboardingProgress currentStep={1} totalSteps={5} stepTitle="Configuration du bar" />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Comment s'appelle votre bar ?</Text>
          <Text style={styles.description}>
            Ce nom apparaîtra sur votre tableau de bord et vos rapports.
          </Text>

          <Input
            label="Nom du bar"
            value={barNameInput}
            onChangeText={text => {
              setBarNameInput(text)
              setError('')
            }}
            error={error}
            placeholder="Ex: Le Soleil Couchant"
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={handleContinue}
          />

          <View style={styles.example}>
            <Text style={styles.exampleTitle}>💡 Exemples:</Text>
            <Text style={styles.exampleText}>
              • Chez Mama Rose{'\n'}
              • Bar des Amis{'\n'}
              • Le Relax Lounge
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          size="large"
          onPress={handleContinue}
          disabled={!barNameInput.trim() || barNameInput.trim().length < 2}
        >
          Continuer
        </Button>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  inner: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  example: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
})
