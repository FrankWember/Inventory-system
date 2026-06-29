import React, { useState } from 'react'
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
} from 'react-native'
import { Input } from '../components/Input'
import { PhoneInput } from '../components/PhoneInput'
import { Button } from '../components/Button'
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface SignUpScreenProps {
  navigation: any
}

type AuthMethod = 'email' | 'phone'

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { signUp } = useAuth()
  const [authMethod, setAuthMethod] = useState<AuthMethod>('phone')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignUp = async () => {
    if (!name.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }

    if (authMethod === 'email' && !validateEmail(email.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide')
      return
    }

    if (authMethod === 'phone' && phone.length !== 9) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (9 chiffres)')
      return
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
      email.trim(),
      password,
      name.trim(),
      authMethod === 'phone' ? phone : undefined
    )
    setLoading(false)

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message || 'Une erreur est survenue')
    } else {
      Alert.alert(
        'Inscription réussie',
        authMethod === 'email'
          ? 'Vérifiez votre email pour confirmer votre compte'
          : 'Votre compte a été créé avec succès',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="beer" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez BarTrack aujourd'hui</Text>
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

            <Input
              label="Nom complet"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
              editable={!loading}
            />

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
                placeholder="Au moins 6 caractères"
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

            <Input
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répétez votre mot de passe"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />

            <Button
              onPress={handleSignUp}
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>

            {loading && (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={styles.loader}
              />
            )}

            <Text style={styles.terms}>
              En créant un compte, vous acceptez nos conditions d'utilisation et notre
              politique de confidentialité
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignIn')}
              disabled={loading}
            >
              <Text style={styles.signInLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? COLORS.surface : COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 440,
    ...Platform.select({
      web: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  authMethodToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  button: {
    marginTop: 8,
  },
  loader: {
    marginTop: 16,
  },
  terms: {
    fontSize: 11,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginRight: 4,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
  },
})
