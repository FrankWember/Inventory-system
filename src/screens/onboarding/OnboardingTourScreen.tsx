import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { TourSlide } from '../../components/onboarding/TourSlide'
import { Button } from '../../components/Button'
import { showAlert } from '../../utils/appAlert'
import { completeOnboarding } from '../../services/onboardingService'
import { COLORS } from '../../utils/helpers'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Tour'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const TOUR_SLIDES = [
  {
    icon: '📊',
    title: 'Tableau de Bord',
    description: 'Visualisez vos ventes, profits et performances en temps réel avec des graphiques intuitifs.',
  },
  {
    icon: '🎯',
    title: 'Sessions Quotidiennes',
    description: 'Enregistrez vos ventes du jour, suivez les achats et calculez automatiquement vos profits.',
  },
  {
    icon: '📦',
    title: 'Gestion du Stock',
    description: 'Suivez votre inventaire, recevez des alertes de stock faible et gérez vos réapprovisionnements.',
  },
  {
    icon: '📈',
    title: 'Analyses & Rapports',
    description: 'Identifiez vos produits les plus rentables et suivez les tendances de votre bar.',
  },
]

export default function OnboardingTourScreen({ navigation }: Props) {
  const { state, reset } = useOnboarding()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [completing, setCompleting] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setCurrentSlide(slideIndex)
  }

  const handleComplete = async () => {
    setCompleting(true)

    try {
      const result = await completeOnboarding(
        state.barName,
        state.selectedDrinks,
        state.drinkConfigs
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete onboarding')
      }

      // Reset onboarding context
      reset()

      // The App.tsx will automatically redirect to MainTabs after onboarding is marked complete
      // We use replace to prevent going back to onboarding
      navigation.getParent()?.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      })
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      showAlert(
        'Erreur',
        `Impossible de terminer la configuration: ${error.message}. Veuillez réessayer.`,
        [
          {
            text: 'Réessayer',
            onPress: handleComplete,
          },
          {
            text: 'Annuler',
            style: 'cancel',
          },
        ]
      )
    } finally {
      setCompleting(false)
    }
  }

  const isLastSlide = currentSlide === TOUR_SLIDES.length - 1

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✅ Configuration terminée!</Text>
        <Text style={styles.headerSubtitle}>Découvrez les fonctionnalités de BarTrack</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {TOUR_SLIDES.map((slide, index) => (
          <TourSlide
            key={index}
            icon={slide.icon}
            title={slide.title}
            description={slide.description}
          />
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {TOUR_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentSlide && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          onPress={handleComplete}
          loading={completing}
          disabled={completing}
        >
          {isLastSlide ? 'Commencer à utiliser BarTrack' : 'Passer la visite'}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  carousel: {
    flex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
})
