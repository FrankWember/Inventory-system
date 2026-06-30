import React, { useState, useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Platform, Dimensions, View, ActivityIndicator } from 'react-native'
import { NavigationContainer, NavigationState, PartialState } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { COLORS, FONT } from './src/utils/helpers'
import { applyGlobalFont } from './src/styles/applyFonts'
import { ResponsiveLayout } from './src/components/ResponsiveLayout'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { SettingsProvider } from './src/contexts/SettingsContext'
import { saveNavigationState, loadNavigationState } from './src/utils/navigationPersistence'

applyGlobalFont()

if (Platform.OS === 'web') {
  require('./src/styles/web.css')
  require('./src/styles/print.css')
}

import DashboardScreen from './src/screens/DashboardScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import SessionScreen from './src/screens/SessionScreen'
import TrendsScreen from './src/screens/TrendsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import AddDrinkScreen from './src/screens/AddDrinkScreen'
import EditDrinkScreen from './src/screens/EditDrinkScreen'
import SessionDetailScreen from './src/screens/SessionDetailScreen'
import ChartDetailScreen, { ChartDetailRow } from './src/screens/ChartDetailScreen'
import SignInScreen from './src/screens/SignInScreen'
import SignUpScreen from './src/screens/SignUpScreen'
import AuthScreen from './src/screens/AuthScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import { WelcomeLoadingScreen } from './src/components/WelcomeLoadingScreen'
import { BarChartItem } from './src/components/SimpleBarChart'

const BREAKPOINT = 768

export type RootStackParamList = {
  SignIn: { mode?: 'signin' } | undefined
  SignUp: { mode?: 'signup' } | undefined
  ForgotPassword: undefined
  MainTabs: undefined
  AddDrink: undefined
  EditDrink: { drinkId: string; hideHeader?: boolean }
  SessionDetail: { sessionId: string }
  ChartDetail: {
    title: string
    subtitle?: string
    chartData: BarChartItem[]
    rows: ChartDetailRow[]
    horizontal?: boolean
    formatValue?: (n: number) => string
    valueIsMoney?: boolean
  }
}

export type TabParamList = {
  Dashboard: undefined
  Inventory: undefined
  Session: undefined
  Trends: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

// URL-based linking for web so page refresh stays on the same screen
const webOrigin = Platform.OS === 'web' && typeof globalThis !== 'undefined'
  ? (globalThis as any).window?.location?.origin || ''
  : ''

const linking = Platform.OS === 'web' ? {
  prefixes: [webOrigin, 'bartrack://'],
  config: {
    screens: {
      SignIn: 'signin',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      MainTabs: {
        path: '',
        screens: {
          Dashboard: '',
          Inventory: 'inventory',
          Session: 'session',
          Trends: 'trends',
          Settings: 'settings',
        },
      },
      AddDrink: 'add-drink',
      EditDrink: 'edit-drink/:drinkId',
      SessionDetail: 'session-detail/:sessionId',
      ChartDetail: 'chart-detail',
    },
  },
} : undefined

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
            if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline'
            else if (route.name === 'Inventory') iconName = focused ? 'cube' : 'cube-outline'
            else if (route.name === 'Session') iconName = focused ? 'clipboard' : 'clipboard-outline'
            else if (route.name === 'Trends') iconName = focused ? 'stats-chart' : 'stats-chart-outline'
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline'
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
            fontFamily: FONT.semibold,
            marginTop: -2,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Accueil' }} />
        <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Stock' }} />
        <Tab.Screen name="Session" component={SessionScreen} options={{ title: 'Session' }} />
        <Tab.Screen name="Trends" component={TrendsScreen} options={{ title: 'Stats' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Paramètres' }} />
      </Tab.Navigator>
    </ResponsiveLayout>
  )
}

function RootNavigator() {
  const { user, loading, isWelcomeLoading } = useAuth()
  // On web, linking handles navigation state — no need for manual restore
  const [isReady, setIsReady] = useState(Platform.OS === 'web')
  const [initialState, setInitialState] = useState<NavigationState | PartialState<NavigationState> | undefined>()

  useEffect(() => {
    if (Platform.OS === 'web') return

    const restoreState = async () => {
      try {
        if (user) {
          const savedState = await loadNavigationState()
          if (savedState) {
            setInitialState(savedState)
          }
        }
      } finally {
        setIsReady(true)
      }
    }

    if (!loading) {
      restoreState()
    }
  }, [loading, user])

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (isWelcomeLoading && user) {
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0]
    return <WelcomeLoadingScreen name={displayName} isReturningUser />
  }

  // Cast needed because initialState is not in the TypeScript types for Stack.Navigator
  // but works at runtime for native state restoration
  const navigatorProps = Platform.OS !== 'web' && initialState ? { initialState } : {}

  return (
    <Stack.Navigator
      {...(navigatorProps as any)}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 17,
          color: COLORS.slateDark,
        },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
      }}
    >
      {!user ? (
        <>
          {Platform.OS === 'web' ? (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="SignIn" component={AuthScreen} options={{ headerShown: false }} initialParams={{ mode: 'signin' }} />
              <Stack.Screen name="SignUp" component={AuthScreen} options={{ headerShown: false }} initialParams={{ mode: 'signup' }} />
            </>
          )}
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="AddDrink"
            component={AddDrinkScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="EditDrink" component={EditDrinkScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChartDetail" component={ChartDetailScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })

  const routeNameRef = useRef<string | undefined>(undefined)
  const navigationRef = useRef<any>(null)

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <StatusBar style="dark" />
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={() => {
              routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name
            }}
            onStateChange={async (state) => {
              const previousRouteName = routeNameRef.current
              const currentRouteName = navigationRef.current?.getCurrentRoute()?.name
              if (previousRouteName !== currentRouteName && Platform.OS !== 'web') {
                await saveNavigationState(state)
              }
              routeNameRef.current = currentRouteName
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
