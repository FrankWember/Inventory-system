import React, { useMemo, useState, useRef, useCallback } from 'react'
import { useSettings } from '../contexts/SettingsContext'
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
import { FONT, ThemeColors } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface SignUpScreenProps {
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { signUp, signInWithPhone } = useAuth()
  const [authMethod, setAuthMethod] = useState<AuthMethod>(getStoredAuthMethod)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  const switchMethod = (method: AuthMethod) => {
    setAuthMethod(method)
    setStoredAuthMethod(method)
    setError(null)
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Le nom est requis'
    if (authMethod === 'email') {
      if (!email.trim()) return 'L\'email est requis'
      if (!EMAIL_REGEX.test(email.trim())) return 'Adresse email invalide'
    } else {
      if (phone.length < 9) return 'Numéro de téléphone invalide (9 chiffres)'
    }
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères'
    if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
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

    const { error } = await signUp(
      authMethod === 'email' ? email.trim() : '',
      password,
      name.trim(),
      authMethod === 'phone' ? phone : undefined
    )

    if (error) {
      setLoading(false)
      setError(error.message)
      shakeError()
      return
    }

    // For phone accounts — sign in automatically (no email verification needed)
    if (authMethod === 'phone') {
      const { error: signInError } = await signInWithPhone(phone, password)
      if (signInError) {
        setLoading(false)
        setSuccessMessage('Compte créé ! Vous pouvez maintenant vous connecter.')
      }
      // If signIn succeeds, AuthContext will update and navigate automatically
    } else {
      // Email accounts may need confirmation
      setLoading(false)
      setSuccessMessage('Compte créé ! Vérifiez votre email pour confirmer votre compte.')
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
                <Ionicons name="beer" size={28} color={colors.primary} />
              </View>
              <Text style={styles.appName}>Créer un compte</Text>
              <Text style={styles.tagline}>Rejoignez BarTrack aujourd'hui</Text>
            </View>

            <View style={styles.divider} />

            {/* Success state */}
            {successMessage ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={40} color="#22C55E" style={{ marginBottom: 10 }} />
                <Text style={styles.successTitle}>Inscription réussie !</Text>
                <Text style={styles.successText}>{successMessage}</Text>
                <TouchableOpacity
                  style={styles.successBtn}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.successBtnText}>Se connecter</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Method toggle */}
                <View style={styles.toggle}>
                  <ToggleBtn label="Téléphone" icon="call" active={authMethod === 'phone'} onPress={() => switchMethod('phone')} />
                  <ToggleBtn label="Email" icon="mail" active={authMethod === 'email'} onPress={() => switchMethod('email')} />
                </View>

                <Input
                  label="Nom complet"
                  value={name}
                  onChangeText={t => { setName(t); setError(null) }}
                  placeholder="Jean Dupont"
                  autoCapitalize="words"
                  editable={!loading}
                />

                {authMethod === 'phone' ? (
                  <PhoneInput
                    label="Numéro de téléphone"
                    value={phone}
                    onChangeText={t => { setPhone(t); setError(null) }}
                    placeholder="6 XX XX XX XX"
                    editable={!loading}
                  />
                ) : (
                  <Input
                    label="Adresse email"
                    value={email}
                    onChangeText={t => { setEmail(t); setError(null) }}
                    placeholder="votre@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                )}

                <View style={styles.passwordWrap}>
                  <Input
                    label="Mot de passe"
                    value={password}
                    onChangeText={t => { setPassword(t); setError(null) }}
                    placeholder="Au moins 6 caractères"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.slate} />
                  </TouchableOpacity>
                </View>

                <Input
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={t => { setConfirmPassword(t); setError(null) }}
                  placeholder="Répétez votre mot de passe"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />

                {/* Inline error */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={15} color={colors.rose} />
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
                    <Text style={styles.submitText}>Créer mon compte</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.terms}>
                  En créant un compte, vous acceptez nos conditions d'utilisation.
                </Text>
              </>
            )}

            {/* Footer */}
            {!successMessage && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>Déjà un compte ?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')} disabled={loading}>
                  <Text style={styles.footerLink}> Se connecter</Text>
                </TouchableOpacity>
              </View>
            )}
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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={15} color={active ? colors.white : colors.slate} />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function LoadingDots() {
  const { colors } = useSettings()
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
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white, opacity: dot }} />
      ))}
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: colors.glassStrong,
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: { fontSize: 24, fontFamily: FONT.bold, color: colors.slateDark, letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontFamily: FONT.regular, color: colors.slate, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 20 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleText: { fontSize: 13, fontFamily: FONT.semibold, color: colors.slate },
  toggleTextActive: { color: colors.white },
  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 34, padding: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.roseLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, fontFamily: FONT.medium, color: colors.rose, flex: 1 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnLoading: { opacity: 0.85 },
  submitText: { fontSize: 16, fontFamily: FONT.semibold, color: colors.white, letterSpacing: 0.2 },
  terms: { fontSize: 11, fontFamily: FONT.regular, color: colors.slate, textAlign: 'center', marginTop: 12, lineHeight: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontSize: 13, fontFamily: FONT.regular, color: colors.slate },
  footerLink: { fontSize: 13, fontFamily: FONT.semibold, color: colors.primary },
  successBox: { alignItems: 'center', paddingVertical: 20 },
  successTitle: { fontSize: 18, fontFamily: FONT.bold, color: colors.slateDark, marginBottom: 8 },
  successText: { fontSize: 14, fontFamily: FONT.regular, color: colors.slate, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successBtnText: { fontSize: 15, fontFamily: FONT.semibold, color: colors.white },
})
