import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Animated,
} from 'react-native'
import { Input } from '../components/Input'
import { PhoneInput } from '../components/PhoneInput'
import { Button } from '../components/Button'
import { FONT, ThemeColors } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface AuthScreenProps {
  navigation: any
  route?: any
}

type AuthMethod = 'email' | 'phone'
type AuthMode = 'signin' | 'signup'

export default function AuthScreen({ navigation, route }: AuthScreenProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { signIn, signInWithPhone, signUp } = useAuth()

  // Determine initial mode based on route or default to signin
  const initialMode: AuthMode = route?.params?.mode || 'signin'
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Animate when mode changes
  useEffect(() => {
    fadeAnim.setValue(0.7)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [mode])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignIn = async () => {
    if (authMethod === 'email') {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs')
        return
      }

      setLoading(true)
      const { error } = await signIn(email.trim(), password)
      setLoading(false)

      if (error) {
        const title = error.type === 'email_not_confirmed'
          ? 'Email non confirmé'
          : error.type === 'user_not_found'
          ? 'Compte introuvable'
          : 'Erreur de connexion'

        Alert.alert(title, error.message)
      }
    } else {
      if (phone.length !== 9 || !password.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro valide et un mot de passe')
        return
      }

      setLoading(true)
      const { error } = await signInWithPhone(phone, password)
      setLoading(false)

      if (error) {
        const title = error.type === 'user_not_found'
          ? 'Compte introuvable'
          : 'Erreur de connexion'

        Alert.alert(title, error.message)
      }
    }
  }

  const handleSignUp = async () => {
    if (!name.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }

    if (authMethod === 'email') {
      if (!email.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer votre email')
        return
      }
      if (!validateEmail(email.trim())) {
        Alert.alert('Erreur', 'Veuillez entrer une adresse email valide')
        return
      }
    }

    if (authMethod === 'phone') {
      if (phone.length !== 9) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (9 chiffres)')
        return
      }
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    const { error } = await signUp(
      authMethod === 'email' ? email.trim() : '',
      password,
      name.trim(),
      authMethod === 'phone' ? phone : undefined
    )
    setLoading(false)

    if (error) {
      const title = error.type === 'email_exists' || error.type === 'phone_exists'
        ? 'Compte existant'
        : error.type === 'weak_password'
        ? 'Mot de passe faible'
        : error.type === 'network_error'
        ? 'Erreur réseau'
        : "Erreur d'inscription"

      Alert.alert(title, error.message)
    } else {
      Alert.alert(
        '✅ Inscription réussie !',
        authMethod === 'email'
          ? 'Vérifiez votre email pour confirmer votre compte, puis connectez-vous.'
          : 'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.',
        [
          {
            text: 'Se connecter',
            onPress: () => toggleMode('signin'),
          },
        ]
      )
    }
  }

  const handleForgotPassword = () => {
    if (Platform.OS === 'web') {
      navigation.navigate('ForgotPassword')
    } else {
      // On mobile, could implement inline password reset
      navigation.navigate('ForgotPassword')
    }
  }

  const toggleMode = (newMode: AuthMode) => {
    if (Platform.OS === 'web') {
      // On web, use navigation
      navigation.navigate(newMode === 'signin' ? 'SignIn' : 'SignUp')
    } else {
      // On mobile, just change state
      setMode(newMode)
    }
  }

  const handleSubmit = () => {
    if (mode === 'signin') {
      handleSignIn()
    } else {
      handleSignUp()
    }
  }

  return (
    <ImageBackground
      source={require('../assets/images/auth-background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="beer" size={48} color={colors.primary} />
              </View>
              <Text style={styles.title}>
                {mode === 'signin' ? 'BarTrack' : 'Créer un compte'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'signin'
                  ? 'Connectez-vous à votre compte'
                  : "Rejoignez BarTrack aujourd'hui"}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.authMethodToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    authMethod === 'phone' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setAuthMethod('phone')}
                  disabled={loading}
                >
                  <Ionicons
                    name="call"
                    size={16}
                    color={authMethod === 'phone' ? colors.white : colors.slate}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      authMethod === 'phone' && styles.toggleTextActive,
                    ]}
                  >
                    Téléphone
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    authMethod === 'email' && styles.toggleButtonActive,
                  ]}
                  onPress={() => setAuthMethod('email')}
                  disabled={loading}
                >
                  <Ionicons
                    name="mail"
                    size={16}
                    color={authMethod === 'email' ? colors.white : colors.slate}
                  />
                  <Text
                    style={[
                      styles.toggleText,
                      authMethod === 'email' && styles.toggleTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>
              </View>

              {mode === 'signup' && (
                <Input
                  label="Nom complet"
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  autoCapitalize="words"
                  editable={!loading}
                />
              )}

              {authMethod === 'phone' ? (
                <PhoneInput
                  label="Numéro de téléphone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="X XX XX XX XX"
                  editable={!loading}
                />
              ) : (
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="votre@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              )}

              <View style={styles.passwordContainer}>
                <Input
                  label="Mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'Au moins 6 caractères' : '••••••••'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.slate}
                  />
                </TouchableOpacity>
              </View>

              {mode === 'signup' && (
                <Input
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Répétez votre mot de passe"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
              )}

              {mode === 'signin' && (
                <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                  <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              )}

              <Button onPress={handleSubmit} disabled={loading} style={styles.button}>
                {loading
                  ? mode === 'signin'
                    ? 'Connexion...'
                    : 'Création...'
                  : mode === 'signin'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
              </Button>

              {loading && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.loader}
                />
              )}

              {mode === 'signup' && (
                <Text style={styles.terms}>
                  En créant un compte, vous acceptez nos conditions d'utilisation et notre
                  politique de confidentialité
                </Text>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'signin' ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}
              </Text>
              <TouchableOpacity
                onPress={() => toggleMode(mode === 'signin' ? 'signup' : 'signin')}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(15px)',
        maxWidth: 340,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: colors.slateDark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: colors.slate,
    textAlign: 'center',
  },
  form: {
    marginBottom: 8,
  },
  authMethodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 5,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: colors.slate,
    letterSpacing: -0.2,
  },
  toggleTextActive: {
    color: colors.white,
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 35,
    padding: 5,
  },
  forgotPassword: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: colors.primary,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 12,
  },
  button: {
    marginTop: 6,
  },
  loader: {
    marginTop: 16,
  },
  terms: {
    fontSize: 9,
    fontFamily: FONT.regular,
    color: colors.slate,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: colors.slate,
    marginRight: 4,
  },
  linkText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: colors.primary,
  },
})
