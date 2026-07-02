import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { OnboardingProvider } from '../../contexts/OnboardingContext'
import OnboardingWelcomeScreen from './OnboardingWelcomeScreen'
import OnboardingBarSetupScreen from './OnboardingBarSetupScreen'
import OnboardingDrinkSelectionScreen from './OnboardingDrinkSelectionScreen'
import OnboardingCustomizeScreen from './OnboardingCustomizeScreen'
import OnboardingStockOverviewScreen from './OnboardingStockOverviewScreen'
import OnboardingTourScreen from './OnboardingTourScreen'

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
  return (
    <OnboardingProvider>
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
    </OnboardingProvider>
  )
}
