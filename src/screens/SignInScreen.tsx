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
        Alert.alert('Erreur de connexion', error.message || 'Email ou mot de passe incorrect')
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
        Alert.alert('Erreur de connexion', error.message || 'Numéro ou mot de passe incorrect')
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
                placeholder="6 XX XX XX XX"
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
  },
  form: {
    marginBottom: 12,
  },
  authMethodToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
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
    fontSize: 13,
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
    right: 12,
    top: 38,
    padding: 8,
  },
  forgotPassword: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: COLORS.primary,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  loader: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginRight: 4,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
  },
})
