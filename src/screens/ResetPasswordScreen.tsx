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
  ImageBackground,
} from 'react-native'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import { COLORS, FONT } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../i18n'
import { Ionicons } from '@expo/vector-icons'

interface ResetPasswordScreenProps {
  navigation: any
  route: any
}

// Reads the single-use token from the reset link (route param, with a
// window.location fallback on web) and lets the user set a new password.
function readToken(route: any): string {
  const fromParams = route?.params?.token
  if (fromParams) return String(fromParams)
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    const search = (globalThis as any).window?.location?.search || ''
    const match = /[?&]token=([^&]+)/.exec(search)
    if (match) return decodeURIComponent(match[1])
  }
  return ''
}

export default function ResetPasswordScreen({ navigation, route }: ResetPasswordScreenProps) {
  const { t } = useTranslation()
  const { confirmPasswordReset } = useAuth()
  const [token] = useState(() => readToken(route))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!token) {
      setError(t('auth.resetInvalidLink'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordMin6'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordsDontMatch'))
      return
    }

    setLoading(true)
    const { error: resetError } = await confirmPasswordReset(token, password)
    setLoading(false)

    if (resetError) {
      setError(resetError.message || t('auth.genericError'))
    } else {
      setDone(true)
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
                <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>{t('auth.resetTitle')}</Text>
              <Text style={styles.subtitle}>{t('auth.resetSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              {done ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.emerald} />
                  <Text style={styles.successText}>{t('auth.resetSuccess')}</Text>
                </View>
              ) : (
                <>
                  <Input
                    label={t('auth.newPasswordLabel')}
                    value={password}
                    onChangeText={v => { setPassword(v); setError(null) }}
                    placeholder={t('auth.passwordHint')}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <Input
                    label={t('auth.confirmPasswordLabel')}
                    value={confirm}
                    onChangeText={v => { setConfirm(v); setError(null) }}
                    placeholder={t('auth.passwordHint')}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.rose} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {!done ? (
                <Button onPress={handleSubmit} disabled={loading} style={styles.button}>
                  {loading ? t('auth.sending') : t('auth.resetSubmit')}
                </Button>
              ) : (
                <Button onPress={() => navigation.navigate('SignIn')} style={styles.button}>
                  {t('auth.signIn')}
                </Button>
              )}

              {loading && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
              )}
            </View>

            {!done && (
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')} disabled={loading}>
                <Text style={styles.backLink}>{t('auth.backToSignIn')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,20,40,0.45)' },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
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
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 26, fontFamily: FONT.bold, color: COLORS.slateDark, marginBottom: 4 },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    textAlign: 'center',
    lineHeight: 19,
  },
  form: { marginBottom: 16 },
  button: { marginTop: 16 },
  loader: { marginTop: 16 },
  backLink: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.primary,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.roseLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.rose,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.emeraldLight,
    borderRadius: 10,
    padding: 12,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.medium,
    color: COLORS.emerald,
    lineHeight: 18,
  },
})
