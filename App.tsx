import React, { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Platform, Dimensions } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from './src/utils/helpers'
import { ResponsiveLayout } from './src/components/ResponsiveLayout'

// Import web-specific styles
if (Platform.OS === 'web') {
  require('./src/styles/web.css')
}

import DashboardScreen from './src/screens/DashboardScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import SessionScreen from './src/screens/SessionScreen'
import TrendsScreen from './src/screens/TrendsScreen'
import FinancesScreen from './src/screens/FinancesScreen'
import AddDrinkScreen from './src/screens/AddDrinkScreen'
import EditDrinkScreen from './src/screens/EditDrinkScreen'

const BREAKPOINT = 768

export type RootStackParamList = {
  MainTabs: undefined
  AddDrink: undefined
  EditDrink: { drinkId: string }
}

export type TabParamList = {
  Dashboard: undefined
  Inventory: undefined
  Session: undefined
  Trends: undefined
  Finances: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

function MainTabs() {
  const insets = useSafeAreaInsets()
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  return (
    <ResponsiveLayout>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home'

            if (route.name === 'Dashboard') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'Inventory') {
              iconName = focused ? 'cube' : 'cube-outline'
            } else if (route.name === 'Session') {
              iconName = focused ? 'clipboard' : 'clipboard-outline'
            } else if (route.name === 'Trends') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline'
            } else if (route.name === 'Finances') {
              iconName = focused ? 'wallet' : 'wallet-outline'
            }

            return <Ionicons name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.slate,
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: COLORS.white,
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                paddingBottom: Math.max(insets.bottom, 6),
                paddingTop: 6,
                height: 56 + Math.max(insets.bottom, 6),
              },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: -2,
          },
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Accueil' }}
        />
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ title: 'Stock' }}
        />
        <Tab.Screen
          name="Session"
          component={SessionScreen}
          options={{ title: 'Session' }}
        />
        <Tab.Screen
          name="Trends"
          component={TrendsScreen}
          options={{ title: 'Stats' }}
        />
        <Tab.Screen
          name="Finances"
          component={FinancesScreen}
          options={{ title: 'Finances' }}
        />
      </Tab.Navigator>
    </ResponsiveLayout>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.white,
            },
            headerTintColor: COLORS.primary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
              color: COLORS.slateDark,
            },
            headerShadowVisible: false,
            headerBackTitle: 'Retour',
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddDrink"
            component={AddDrinkScreen}
            options={{ title: 'Ajouter' }}
          />
          <Stack.Screen
            name="EditDrink"
            component={EditDrinkScreen}
            options={{ title: 'Modifier' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
