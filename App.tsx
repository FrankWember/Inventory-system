import React, { useState, useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Platform, Dimensions, View, ActivityIndicator, Text as RNText, TouchableOpacity } from 'react-native'
import { NavigationContainer, NavigationState, PartialState, NavigatorScreenParams } from '@react-navigation/native'
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
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext'
import { t, useTranslation } from './src/i18n'
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
import EditDrinkScreen from './src/screens/EditDrinkScreen'
import SessionDetailScreen from './src/screens/SessionDetailScreen'
import ChartDetailScreen, { ChartDetailRow } from './src/screens/ChartDetailScreen'
import SignInScreen from './src/screens/SignInScreen'
import SignUpScreen from './src/screens/SignUpScreen'
import AuthScreen from './src/screens/AuthScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import ResetPasswordScreen from './src/screens/ResetPasswordScreen'
import { WelcomeLoadingScreen } from './src/components/WelcomeLoadingScreen'
import { BarChartItem } from './src/components/SimpleBarChart'
import OnboardingNavigator, { OnboardingStackParamList } from './src/screens/onboarding/OnboardingNavigator'
import { hasCompletedOnboarding } from './src/services/onboardingService'

const BREAKPOINT = 768

// A render error anywhere used to blank the whole app (white screen, no
// message). Catch it and offer a reload instead.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Uncaught render error:', error, info)
  }

  handleReload = () => {
    if (Platform.OS === 'web') {
      ;(globalThis as any).window?.location?.reload?.()
    } else {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.rose} />
          <RNText style={{ fontSize: 18, fontWeight: '700', color: COLORS.slateDark, marginTop: 16, textAlign: 'center' }}>
            {t('common.appErrorTitle')}
          </RNText>
          <RNText style={{ fontSize: 14, color: COLORS.slate, marginTop: 8, textAlign: 'center' }}>
            {t('common.appErrorBody')}
          </RNText>
          <TouchableOpacity
            onPress={this.handleReload}
            style={{ marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <RNText style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>{t('common.reload')}</RNText>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

export type RootStackParamList = {
  SignIn: { mode?: 'signin' } | undefined
  SignUp: { mode?: 'signup' } | undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string } | undefined
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>
  MainTabs: undefined
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
      ResetPassword: 'reset-password',
      Onboarding: {
        path: 'onboarding',
        screens: {
          Welcome: 'welcome',
          BarSetup: 'bar-setup',
          DrinkSelection: 'drink-selection',
          Customize: 'customize',
          StockOverview: 'stock-overview',
          Tour: 'tour',
        },
      },
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
      EditDrink: 'edit-drink/:drinkId',
      SessionDetail: 'session-detail/:sessionId',
      ChartDetail: 'chart-detail',
    },
  },
} : undefined

function MainTabs() {
  const { t } = useTranslation()
  const { colors } = useSettings()
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
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.slate,
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
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
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('misc.tabHome') }} />
        <Tab.Screen name="Inventory" component={InventoryScreen} options={{ title: t('misc.tabStock') }} />
        <Tab.Screen name="Session" component={SessionScreen} options={{ title: t('misc.tabSession') }} />
        <Tab.Screen name="Trends" component={TrendsScreen} options={{ title: t('misc.tabStats') }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('misc.tabSettings') }} />
      </Tab.Navigator>
    </ResponsiveLayout>
  )
}

function RootNavigator() {
  const { t } = useTranslation()
  const { colors } = useSettings()
  const { user, loading, isWelcomeLoading } = useAuth()
  // On web, linking handles navigation state — no need for manual restore
  const [isReady, setIsReady] = useState(Platform.OS === 'web')
  const [initialState, setInitialState] = useState<NavigationState | PartialState<NavigationState> | undefined>()
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const navigationRef = useRef<any>(null)

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

  // Check onboarding status when user changes (from database)
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user) {
        const completed = await hasCompletedOnboarding()
        setOnboardingComplete(completed)
      } else {
        setOnboardingComplete(false)
      }
      setCheckingOnboarding(false)
    }

    if (!loading) {
      checkOnboarding()
    }
  }, [user, loading])

  if (loading || !isReady || checkingOnboarding) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (isWelcomeLoading && user) {
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0]
    const isReturning = onboardingComplete
    return <WelcomeLoadingScreen name={displayName} isReturningUser={isReturning} />
  }

  // Cast needed because initialState is not in the TypeScript types for Stack.Navigator
  // but works at runtime for native state restoration
  const navigatorProps = Platform.OS !== 'web' && initialState ? { initialState } : {}

  // Determine initial route based on onboarding status
  const initialRouteName = !onboardingComplete ? 'Onboarding' : 'MainTabs'

  return (
    <Stack.Navigator
      ref={navigationRef}
      {...(navigatorProps as any)}
      initialRouteName={user && !onboardingComplete ? initialRouteName : undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 17,
          color: colors.slateDark,
        },
        headerShadowVisible: false,
        headerBackTitle: t('common.back'),
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
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          {!onboardingComplete && (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingNavigator}
              options={{
                headerShown: false,
                presentation: Platform.OS === 'web' ? 'transparentModal' : 'fullScreenModal',
                animation: 'fade',
              }}
            />
          )}
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="EditDrink" component={EditDrinkScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ChartDetail" component={ChartDetailScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })
  // Never let font loading block the app forever: expo-font's web observer can
  // reject/hang on a cold cache even though the @font-face rules are injected
  // and will apply once ready. After 3s (or on error) we render regardless.
  const [fontWaitExpired, setFontWaitExpired] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitExpired(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const routeNameRef = useRef<string | undefined>(undefined)
  const navigationRef = useRef<any>(null)

  if (!fontsLoaded && !fontError && !fontWaitExpired) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <StatusBar style="dark" />
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            documentTitle={{
              formatter: () => 'BarTrack — Gestion d\'inventaire',
            }}
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
    </ErrorBoundary>
  )
}
