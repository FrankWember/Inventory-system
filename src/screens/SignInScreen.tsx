import React, { useState, useEffect, useRef } from 'react'
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
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface SignInScreenProps {
  navigation: any
}

type AuthMethod = 'email' | 'phone'

export default function SignInScreen({ navigation }: SignInScreenProps) {
  const { signIn, signInWithPhone } = useAuth()
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
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

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword')
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
              <Ionicons name="beer" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>BarTrack</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.authMethodToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, authMethod === 'phone' && styles.toggleButtonActive]}
                onPress={() => setAuthMethod('phone')}
                disabled={loading}
              >
                <Ionicons
                  name="call"
                  size={16}
                  color={authMethod === 'phone' ? COLORS.white : COLORS.slate}
                />
                <Text style={[styles.toggleText, authMethod === 'phone' && styles.toggleTextActive]}>
                  Téléphone
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, authMethod === 'email' && styles.toggleButtonActive]}
                onPress={() => setAuthMethod('email')}
                disabled={loading}
              >
                <Ionicons
                  name="mail"
                  size={16}
                  color={authMethod === 'email' ? COLORS.white : COLORS.slate}
                />
                <Text style={[styles.toggleText, authMethod === 'email' && styles.toggleTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

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
                placeholder="••••••••"
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
                  color={COLORS.slate}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              onPress={handleSignIn}
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            {loading && (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={styles.loader}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous n'avez pas de compte ?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              disabled={loading}
            >
              <Text style={styles.signUpLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
  },
  form: {
    marginBottom: 8,
  },
  authMethodToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: COLORS.slate,
    letterSpacing: -0.2,
  },
  toggleTextActive: {
    color: COLORS.white,
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
    color: COLORS.primary,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginRight: 4,
  },
  signUpLink: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
  },
})
