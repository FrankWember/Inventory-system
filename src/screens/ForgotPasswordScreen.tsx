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
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
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
