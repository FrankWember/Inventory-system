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

interface SignInScreenProps {
  navigation: any
}

export default function SignInScreen({ navigation }: SignInScreenProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignIn = async () => {
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
  }

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword')
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
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="beer" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>BarTrack</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
        </View>

        <View style={styles.form}>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
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
    fontSize: 14,
    fontFamily: FONT.medium,
    color: COLORS.primary,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 24,
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
    marginTop: 24,
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
