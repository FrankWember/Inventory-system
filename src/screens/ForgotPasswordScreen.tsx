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

interface ForgotPasswordScreenProps {
  navigation: any
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email')
      return
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide')
      return
    }

    setLoading(true)
    const { error } = await resetPassword(email.trim())
    setLoading(false)

    if (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue')
    } else {
      Alert.alert(
        'Email envoyé',
        'Un lien de réinitialisation a été envoyé à votre adresse email',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
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
              <Ionicons name="key" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un lien de réinitialisation
            </Text>
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

            <Button
              onPress={handleResetPassword}
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>

            {loading && (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={styles.loader}
              />
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.backLink}>Retour à la connexion</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
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
      default: {
        paddingHorizontal: 0,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
    paddingHorizontal: 0,
    lineHeight: 19,
  },
  form: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  loader: {
    marginTop: 16,
  },
  backLink: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
    textAlign: 'center',
  },
})
