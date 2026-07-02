import React, { useMemo } from 'react'
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { OnboardingProvider } from '../../contexts/OnboardingContext'
import { LIGHT_COLORS, RADIUS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import OnboardingWelcomeScreen from './OnboardingWelcomeScreen'
import OnboardingBarSetupScreen from './OnboardingBarSetupScreen'
import OnboardingDrinkSelectionScreen from './OnboardingDrinkSelectionScreen'
import OnboardingCustomizeScreen from './OnboardingCustomizeScreen'
import OnboardingStockOverviewScreen from './OnboardingStockOverviewScreen'
import OnboardingTourScreen from './OnboardingTourScreen'

type Colors = typeof LIGHT_COLORS

export type OnboardingStackParamList = {
  Welcome: undefined
  BarSetup: undefined
  DrinkSelection: undefined
  Customize: undefined
  StockOverview: undefined
  Tour: undefined
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

export default function OnboardingNavigator() {
  const { colors } = useSettings()
  const { width, height } = useWindowDimensions()
  const styles = useMemo(() => makeStyles(colors, height), [colors, height])

  const isDesktop = Platform.OS === 'web' && width >= 1024

  return (
    <OnboardingProvider>
      {isDesktop ? (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
              initialRouteName="Welcome"
            >
              <Stack.Screen name="Welcome" component={OnboardingWelcomeScreen} />
              <Stack.Screen name="BarSetup" component={OnboardingBarSetupScreen} />
              <Stack.Screen name="DrinkSelection" component={OnboardingDrinkSelectionScreen} />
              <Stack.Screen name="Customize" component={OnboardingCustomizeScreen} />
              <Stack.Screen name="StockOverview" component={OnboardingStockOverviewScreen} />
              <Stack.Screen name="Tour" component={OnboardingTourScreen} />
            </Stack.Navigator>
          </View>
        </View>
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
          initialRouteName="Welcome"
        >
          <Stack.Screen name="Welcome" component={OnboardingWelcomeScreen} />
          <Stack.Screen name="BarSetup" component={OnboardingBarSetupScreen} />
          <Stack.Screen name="DrinkSelection" component={OnboardingDrinkSelectionScreen} />
          <Stack.Screen name="Customize" component={OnboardingCustomizeScreen} />
          <Stack.Screen name="StockOverview" component={OnboardingStockOverviewScreen} />
          <Stack.Screen name="Tour" component={OnboardingTourScreen} />
        </Stack.Navigator>
      )}
    </OnboardingProvider>
  )
}

function makeStyles(c: Colors, windowHeight: number) {
  const modalHeight = Math.min(windowHeight * 0.9, 720)

  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', // Dark overlay
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      ...Platform.select({
        web: {
          backdropFilter: 'blur(8px)',
        } as object,
      }),
    },
    modalContainer: {
      width: '100%',
      maxWidth: 920,
      height: modalHeight,
      borderRadius: RADIUS.xl,
      backgroundColor: c.background,
      overflow: 'hidden',
      ...Platform.select({
        web: {
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        } as object,
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 10,
        },
      }),
    },
  })
}
