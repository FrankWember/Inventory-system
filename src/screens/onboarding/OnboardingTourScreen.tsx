import React, { useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { TourSlide } from '../../components/onboarding/TourSlide'
import { OnboardingFinishing, FinishStage } from '../../components/onboarding/OnboardingFinishing'
import { Button } from '../../components/Button'
import { showAlert } from '../../utils/appAlert'
import { updateBarSettings, bulkInsertDrinks } from '../../services/onboardingService'
import { setOnboardingCompleted } from '../../lib/storage'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Tour'>
type Colors = typeof LIGHT_COLORS

export default function OnboardingTourScreen({ navigation }: Props) {
  const { state, reset } = useOnboarding()
  const { colors } = useSettings()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [currentSlide, setCurrentSlide] = useState(0)
  const [finishStage, setFinishStage] = useState<FinishStage | null>(null)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const slides: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
    { icon: 'bar-chart', title: t('onboarding.tourSlide1Title'), description: t('onboarding.tourSlide1Desc') },
    { icon: 'today', title: t('onboarding.tourSlide2Title'), description: t('onboarding.tourSlide2Desc') },
    { icon: 'cube', title: t('onboarding.tourSlide3Title'), description: t('onboarding.tourSlide3Desc') },
    { icon: 'trending-up', title: t('onboarding.tourSlide4Title'), description: t('onboarding.tourSlide4Desc') },
  ]

  const onCarouselLayout = (e: LayoutChangeEvent) => setCarouselWidth(e.nativeEvent.layout.width)

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (carouselWidth <= 0) return
    setCurrentSlide(Math.round(e.nativeEvent.contentOffset.x / carouselWidth))
  }

  const handleComplete = async () => {
    try {
      setFinishStage('bar')
      const barResult = await updateBarSettings(state.barName)
      if (!barResult.success) throw new Error(barResult.error)

      setFinishStage('drinks')
      const drinksResult = await bulkInsertDrinks(state.selectedDrinks, state.drinkConfigs)
      if (!drinksResult.success) throw new Error(drinksResult.error)

      setFinishStage('wrap')
      await setOnboardingCompleted()

      setFinishStage('done')
      reset()
      // Brief success beat before handing off to the app.
      setTimeout(() => {
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] })
      }, 900)
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      setFinishStage(null)
      showAlert(
        t('onboarding.errorTitle'),
        t('onboarding.errorCompleteFail', { msg: error?.message || '' }),
        [
          { text: t('onboarding.errorRetry'), onPress: handleComplete },
          { text: t('onboarding.errorCancel'), style: 'cancel' },
        ]
      )
    }
  }

  if (finishStage) {
    return <OnboardingFinishing stage={finishStage} drinkCount={state.selectedDrinks.length} />
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACE['2xl'] }]}>
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={20} color={colors.white} />
        </View>
        <Text style={styles.headerTitle}>{t('onboarding.tourDoneTitle')}</Text>
        <Text style={styles.headerSubtitle}>{t('onboarding.tourDoneSubtitle')}</Text>
      </View>

      <View style={styles.carouselWrap} onLayout={onCarouselLayout}>
        {carouselWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {slides.map((slide, i) => (
              <TourSlide
                key={i}
                icon={slide.icon}
                title={slide.title}
                description={slide.description}
                width={carouselWidth}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentSlide && styles.dotActive]} />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACE.lg) + SPACE.sm }]}>
        <View style={styles.footerInner}>
          <Button variant="primary" size="large" onPress={handleComplete}>
            {t('onboarding.tourFinish')}
          </Button>
        </View>
      </View>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: SPACE.xl,
      paddingBottom: SPACE.lg,
      alignItems: 'center',
    },
    doneBadge: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.pill,
      backgroundColor: c.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACE.md,
    },
    headerTitle: {
      ...TYPE.h1,
      color: c.slateDark,
      textAlign: 'center',
      marginBottom: SPACE.xs,
    },
    headerSubtitle: {
      ...TYPE.body,
      color: c.slate,
      textAlign: 'center',
    },
    carouselWrap: {
      flex: 1,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACE.xl,
      gap: SPACE.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: c.borderStrong,
    },
    dotActive: {
      width: 24,
      backgroundColor: c.primary,
    },
    footer: {
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.lg,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerInner: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
  })
}
