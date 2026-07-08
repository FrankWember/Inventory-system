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
import { Logo } from '../components/Logo'
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from '../i18n'

interface SignUpScreenProps {
  navigation: any
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  const validate = (): string | null => {
    if (!name.trim()) return t('auth.nameRequired')
    if (!email.trim()) return t('auth.emailRequired')
    if (!EMAIL_REGEX.test(email.trim())) return t('auth.invalidEmail')
    if (phone.length < 9) return t('auth.invalidPhone9')
    if (password.length < 6) return t('auth.passwordMin6')
    return null
  }

  const handleSignUp = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      shakeError()
      return
    }

    setError(null)
    setLoading(true)

    const { error} = await signUp(
      email.trim(),
      password,
      name.trim(),
      phone
    )

    if (error) {
      setLoading(false)
      setError(error.message)
      shakeError()
      return
    }

    // Show success message
    setLoading(false)
    setSuccessMessage(t('auth.accountCreatedSignIn'))
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
                <Logo size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.appName}>{t('auth.signUpTitle')}</Text>
              <Text style={styles.tagline}>{t('auth.signUpTagline')}</Text>
            </View>

            <View style={styles.divider} />

            {/* Success state */}
            {successMessage ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={40} color="#22C55E" style={{ marginBottom: 10 }} />
                <Text style={styles.successTitle}>{t('auth.signUpSuccess')}</Text>
                <Text style={styles.successText}>{successMessage}</Text>
                <TouchableOpacity
                  style={styles.successBtn}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.successBtnText}>{t('auth.signIn')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Input
                  label={t('auth.nameLabel')}
                  value={name}
                  onChangeText={v => { setName(v); setError(null) }}
                  placeholder={t('auth.namePlaceholder')}
                  autoCapitalize="words"
                  editable={!loading}
                />

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

                <PhoneInput
                  label={`${t('auth.phoneLabel')} *`}
                  value={phone}
                  onChangeText={v => { setPhone(v); setError(null) }}
                  placeholder={t('auth.phonePlaceholder')}
                  editable={!loading}
                />
                <Text style={styles.fieldHint}>{t('auth.phoneRequiredHint')}</Text>

                <View style={styles.passwordWrap}>
                  <Input
                    label={t('auth.passwordLabel')}
                    value={password}
                    onChangeText={v => { setPassword(v); setError(null) }}
                    placeholder={t('auth.passwordHint')}
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

                {/* Inline error */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={15} color={COLORS.rose} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnLoading]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <LoadingDots />
                  ) : (
                    <Text style={styles.submitText}>{t('auth.signUp')}</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.terms}>
                  {t('auth.terms')}
                </Text>
              </>
            )}

            {/* Footer */}
            {!successMessage && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.alreadyAccount')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} disabled={loading}>
                  <Text style={styles.footerLink}> {t('auth.signIn')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
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
  appName: { fontSize: 24, fontFamily: FONT.bold, color: COLORS.slateDark, letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 20 },
  fieldHint: { fontSize: 11, fontFamily: FONT.regular, color: COLORS.slate, marginTop: -8, marginBottom: 12, marginLeft: 4 },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 34, padding: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    marginTop: 4,
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
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnLoading: { opacity: 0.85 },
  submitText: { fontSize: 16, fontFamily: FONT.semibold, color: COLORS.white, letterSpacing: 0.2 },
  terms: { fontSize: 11, fontFamily: FONT.regular, color: COLORS.slate, textAlign: 'center', marginTop: 12, lineHeight: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate },
  footerLink: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.primary },
  successBox: { alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 18, fontFamily: FONT.bold, color: COLORS.slateDark, marginBottom: 8 },
  successText: { fontSize: 14, fontFamily: FONT.regular, color: COLORS.slate, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successBtnText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.white },
})
