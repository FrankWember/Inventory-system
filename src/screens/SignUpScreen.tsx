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
import { Button } from '../components/Button'
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'

interface SignUpScreenProps {
  navigation: any
}

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide')
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
    const { error } = await signUp(email.trim(), password, name.trim())
    setLoading(false)

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message || 'Une erreur est survenue')
    } else {
      Alert.alert(
        'Inscription réussie',
        'Vérifiez votre email pour confirmer votre compte',
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
            <Input
              label="Nom complet"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
              editable={!loading}
            />

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
    backgroundColor: COLORS.surface,
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
