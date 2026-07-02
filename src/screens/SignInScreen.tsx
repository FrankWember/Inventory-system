import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ImageBackground,
} from 'react-native'
import { Input } from '../components/Input'
import { PhoneInput } from '../components/PhoneInput'
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from '../i18n'

interface SignInScreenProps {
  navigation: any
}

type AuthMethod = 'phone' | 'email'

function getStoredAuthMethod(): AuthMethod {
  if (Platform.OS === 'web') {
    try {
      return ((globalThis as any).sessionStorage?.getItem('authMethod') as AuthMethod) || 'phone'
    } catch { return 'phone' }
  }
  return 'phone'
}

function setStoredAuthMethod(method: AuthMethod) {
  if (Platform.OS === 'web') {
    try { (globalThis as any).sessionStorage?.setItem('authMethod', method) } catch { /* ignore */ }
  }
}

export default function SignInScreen({ navigation }: SignInScreenProps) {
  const { t } = useTranslation()
  const { signIn, signInWithPhone } = useAuth()
  const [authMethod, setAuthMethod] = useState<AuthMethod>(getStoredAuthMethod)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current
  const shakeAnim = useRef(new Animated.Value(0)).current
  const hasAnimated = useRef(false)

  const startEntrance = useCallback(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start()
  }, [fadeAnim, slideAnim])

  // Start entrance on mount
  React.useEffect(() => { startEntrance() }, [startEntrance])

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const switchMethod = (method: AuthMethod) => {
    setAuthMethod(method)
    setStoredAuthMethod(method)
    setError(null)
  }

  const handleSignIn = async () => {
    setError(null)

    if (authMethod === 'email') {
      if (!email.trim() || !password.trim()) {
        setError(t('auth.fillAllFields'))
        shakeError()
        return
      }
      setLoading(true)
      const { error } = await signIn(email.trim(), password)
      setLoading(false)
      if (error) {
        setError(error.message)
        shakeError()
      }
    } else {
      if (phone.length < 9 || !password.trim()) {
        setError(t('auth.invalidPhoneOrPassword'))
        shakeError()
        return
      }
      setLoading(true)
      const { error } = await signInWithPhone(phone, password)
      setLoading(false)
      if (error) {
        setError(error.message)
        shakeError()
      }
    }
  }

  return (
    <ImageBackground
      source={require('../assets/images/auth-background.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <Ionicons name="beer" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.appName}>BarTrack</Text>
              <Text style={styles.tagline}>{t('auth.tagline')}</Text>
            </View>

            <View style={styles.divider} />

            {/* Method toggle */}
            {/* @ts-ignore - web-only className */}
            <View style={styles.toggle} className="glass-toggle">
              <ToggleBtn
                label={t('auth.phone')}
                icon="call"
                active={authMethod === 'phone'}
                onPress={() => switchMethod('phone')}
              />
              <ToggleBtn
                label={t('auth.email')}
                icon="mail"
                active={authMethod === 'email'}
                onPress={() => switchMethod('email')}
              />
            </View>

            {/* Fields */}
            {authMethod === 'phone' ? (
              <PhoneInput
                label={t('auth.phoneLabel')}
                value={phone}
                onChangeText={v => { setPhone(v); setError(null) }}
                placeholder={t('auth.phonePlaceholder')}
                editable={!loading}
              />
            ) : (
              <Input
                label={t('auth.emailLabel')}
                value={email}
                onChangeText={v => { setEmail(v); setError(null) }}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            )}

            <View style={styles.passwordWrap}>
              <Input
                label={t('auth.passwordLabel')}
                value={password}
                onChangeText={v => { setPassword(v); setError(null) }}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={COLORS.slate} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotBtn}
              disabled={loading}
            >
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Inline error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={15} color={COLORS.rose} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnLoading]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.submitInner}>
                  <LoadingDots />
                </View>
              ) : (
                <Text style={styles.submitText}>{t('auth.signIn')}</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} disabled={loading}>
                <Text style={styles.footerLink}> {t('auth.createAccount')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

function ToggleBtn({ label, icon, active, onPress }: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
      // @ts-ignore - web-only className
      className={active ? 'glass-toggle-active' : ''}
    >
      <Ionicons name={icon} size={15} color={active ? COLORS.white : COLORS.slate} />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.4)).current
  const dot2 = useRef(new Animated.Value(0.4)).current
  const dot3 = useRef(new Animated.Value(0.4)).current

  React.useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      )
    const a1 = pulse(dot1, 0)
    const a2 = pulse(dot2, 200)
    const a3 = pulse(dot3, 400)
    a1.start(); a2.start(); a3.start()
    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [dot1, dot2, dot3])

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.white, opacity: dot }} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  flex: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,40,0.45)' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 16,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', maxWidth: 360 } as any,
    }),
  },
  header: { alignItems: 'center', marginBottom: 20 },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 26,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleText: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.slate },
  toggleTextActive: { color: COLORS.white },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 34, padding: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 16 },
  forgotText: { fontSize: 12, fontFamily: FONT.medium, color: COLORS.primary },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, fontFamily: FONT.medium, color: COLORS.rose, flex: 1 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnLoading: { opacity: 0.85 },
  submitInner: { alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontFamily: FONT.semibold, color: COLORS.white, letterSpacing: 0.2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate },
  footerLink: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.primary },
})
