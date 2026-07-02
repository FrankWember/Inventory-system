import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'BarSetup'>
type Colors = typeof LIGHT_COLORS

export default function OnboardingBarSetupScreen({ navigation }: Props) {
  const { state, setBarName } = useOnboarding()
  const { colors } = useSettings()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [barNameInput, setBarNameInput] = useState(state.barName)
  const [error, setError] = useState('')

  const handleContinue = () => {
    const trimmed = barNameInput.trim()
    if (!trimmed) return setError(t('onboarding.barErrorRequired'))
    if (trimmed.length < 2) return setError(t('onboarding.barErrorMin'))
    if (trimmed.length > 50) return setError(t('onboarding.barErrorMax'))
    setBarName(trimmed)
    navigation.navigate('DrinkSelection')
  }

  const canContinue = barNameInput.trim().length >= 2

  return (
    <OnboardingLayout
      step={1}
      title={t('onboarding.barTitle')}
      subtitle={t('onboarding.barDescription')}
      onBack={() => navigation.goBack()}
      footer={
        <Button variant="primary" size="large" onPress={handleContinue} disabled={!canContinue}>
          {t('onboarding.continue')}
        </Button>
      }
    >
      <Input
        label={t('onboarding.barLabel')}
        value={barNameInput}
        onChangeText={text => {
          setBarNameInput(text)
          if (error) setError('')
        }}
        error={error}
        placeholder={t('onboarding.barPlaceholder')}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
      />

      <View style={styles.example}>
        <View style={styles.exampleHeader}>
          <Ionicons name="bulb-outline" size={16} color={colors.amber} />
          <Text style={styles.exampleTitle}>{t('onboarding.barExamplesTitle')}</Text>
        </View>
        <Text style={styles.exampleText}>{t('onboarding.barExamples')}</Text>
      </View>
    </OnboardingLayout>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    example: {
      marginTop: SPACE.xl,
      padding: SPACE.lg,
      backgroundColor: c.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    exampleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      marginBottom: SPACE.sm,
    },
    exampleTitle: {
      ...TYPE.h3,
      fontFamily: FONT.semibold,
      color: c.inkSoft,
    },
    exampleText: {
      ...TYPE.body,
      color: c.slate,
      lineHeight: 22,
    },
  })
}
