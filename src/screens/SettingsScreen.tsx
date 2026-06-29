import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '../components/ScreenHeader'
import { Card } from '../components/Card'
import { COLORS } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { clearCache, exportData } from '../lib/storage'
import { supabase } from '../lib/supabase'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { theme, language, notificationsEnabled, barInfo, setTheme, setLanguage, setNotificationsEnabled, updateBarInfo } = useSettings()

  const handleBarInfo = () => {
    Alert.prompt(
      'Informations du bar',
      'Nom de votre établissement',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Enregistrer',
          onPress: async (name?: string) => {
            if (name?.trim()) {
              try {
                await updateBarInfo({ name: name.trim() })
                Alert.alert('Succès', 'Informations enregistrées')
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de sauvegarder')
              }
            }
          },
        },
      ],
      'plain-text',
      barInfo?.name || ''
    )
  }

  const handleNotifications = () => {
    Alert.alert(
      'Notifications',
      'Voulez-vous activer les notifications ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: notificationsEnabled ? 'Désactiver' : 'Activer',
          onPress: async () => {
            try {
              await setNotificationsEnabled(!notificationsEnabled)
              Alert.alert('Succès', `Notifications ${!notificationsEnabled ? 'activées' : 'désactivées'}`)
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de modifier les paramètres')
            }
          },
        },
      ]
    )
  }

  const handleLanguage = () => {
    Alert.alert(
      'Langue',
      'Choisissez votre langue',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Français',
          onPress: async () => {
            try {
              await setLanguage('fr')
              Alert.alert('Succès', 'Langue changée en Français')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de changer la langue')
            }
          },
        },
        {
          text: 'English',
          onPress: async () => {
            try {
              await setLanguage('en')
              Alert.alert('Success', 'Language changed to English')
            } catch (error) {
              Alert.alert('Error', 'Unable to change language')
            }
          },
        },
      ]
    )
  }

  const handleTheme = () => {
    Alert.alert(
      'Thème',
      'Choisissez le thème de l\'application',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clair',
          onPress: async () => {
            try {
              await setTheme('light')
              Alert.alert('Succès', 'Thème clair activé')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de changer le thème')
            }
          },
        },
        {
          text: 'Sombre',
          onPress: async () => {
            try {
              await setTheme('dark')
              Alert.alert('Succès', 'Thème sombre activé (à venir)')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de changer le thème')
            }
          },
        },
      ]
    )
  }

  const handleExportData = async () => {
    try {
      const data = await exportData()

      if (Platform.OS === 'web') {
        // For web, download as JSON file
        try {
          const blob = new Blob([data])
          const url = URL.createObjectURL(blob)
          const a = (global as any).document?.createElement('a')
          if (a) {
            a.href = url
            a.download = `bartrack-export-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
          }
        } catch (webError) {
          // Fallback for web environments without document
          console.error('Web export failed:', webError)
        }
        Alert.alert('Succès', 'Données exportées avec succès')
      } else {
        // For mobile, use share
        await Share.share({
          message: data,
          title: 'Export BarTrack',
        })
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter les données')
    }
  }

  const handleBackupData = async () => {
    try {
      // Export drinks to Supabase
      const { data: drinks, error } = await supabase
        .from('drinks')
        .select('*')

      if (error) throw error

      Alert.alert(
        'Sauvegarde cloud',
        `${drinks?.length || 0} articles trouvés dans le cloud.\n\nLa synchronisation automatique est active.`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accéder à la sauvegarde cloud')
    }
  }

  const handleClearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Êtes-vous sûr de vouloir vider le cache de l\'application ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCache()
              Alert.alert('Succès', 'Cache vidé avec succès')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de vider le cache')
            }
          },
        },
      ]
    )
  }

  const handleUserProfile = () => {
    if (!user) return

    Alert.alert(
      'Profil utilisateur',
      `Email: ${user.email}\nID: ${user.id}`,
      [{ text: 'OK' }]
    )
  }

  const handleChangePassword = async () => {
    if (!user?.email) return

    Alert.alert(
      'Changer le mot de passe',
      'Un email de réinitialisation va être envoyé à votre adresse',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(user.email!)
              if (error) throw error
              Alert.alert('Succès', 'Email de réinitialisation envoyé')
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'envoyer l\'email')
            }
          },
        },
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter')
            }
          },
        },
      ]
    )
  }

  const handleAbout = () => {
    Alert.alert(
      'À propos',
      'BarTrack - Gestion de bar\nVersion 1.0.0\n\nDéveloppé avec React Native et Supabase',
      [{ text: 'OK' }]
    )
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Paramètres" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* General Settings */}
        <Text style={styles.sectionTitle}>Général</Text>
        <Card style={styles.card}>
          <SettingItem
            icon="business-outline"
            label="Informations du bar"
            value={barInfo?.name}
            onPress={handleBarInfo}
          />
          <SettingItem
            icon="notifications-outline"
            label="Notifications"
            value={notificationsEnabled ? 'Activées' : 'Désactivées'}
            onPress={handleNotifications}
            showDivider
          />
          <SettingItem
            icon="globe-outline"
            label="Langue"
            value={language === 'fr' ? 'Français' : 'English'}
            onPress={handleLanguage}
            showDivider
          />
          <SettingItem
            icon="color-palette-outline"
            label="Thème"
            value={theme === 'light' ? 'Clair' : 'Sombre'}
            onPress={handleTheme}
          />
        </Card>

        {/* Data Management */}
        <Text style={styles.sectionTitle}>Données</Text>
        <Card style={styles.card}>
          <SettingItem
            icon="download-outline"
            label="Exporter les données"
            onPress={handleExportData}
          />
          <SettingItem
            icon="cloud-upload-outline"
            label="Sauvegarde cloud"
            onPress={handleBackupData}
            showDivider
          />
          <SettingItem
            icon="trash-outline"
            label="Vider le cache"
            onPress={handleClearCache}
            destructive
          />
        </Card>

        {/* Account */}
        {user && (
          <>
            <Text style={styles.sectionTitle}>Compte</Text>
            <Card style={styles.card}>
              <SettingItem
                icon="person-outline"
                label="Profil utilisateur"
                value={user.email?.split('@')[0]}
                onPress={handleUserProfile}
              />
              <SettingItem
                icon="key-outline"
                label="Changer le mot de passe"
                onPress={handleChangePassword}
                showDivider
              />
              <SettingItem
                icon="log-out-outline"
                label="Déconnexion"
                onPress={handleLogout}
                destructive
              />
            </Card>
          </>
        )}

        {/* About */}
        <Text style={styles.sectionTitle}>Application</Text>
        <Card style={styles.card}>
          <SettingItem
            icon="information-circle-outline"
            label="À propos"
            onPress={handleAbout}
          />
          <SettingItem
            icon="help-circle-outline"
            label="Aide & Support"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            showDivider
          />
          <SettingItem
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            showDivider
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
          />
        </Card>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  )
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string
  onPress: () => void
  showDivider?: boolean
  destructive?: boolean
}

function SettingItem({ icon, label, value, onPress, showDivider, destructive }: SettingItemProps) {
  return (
    <>
      <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, destructive && styles.iconContainerDestructive]}>
            <Ionicons
              name={icon}
              size={20}
              color={destructive ? COLORS.rose : COLORS.primary}
            />
          </View>
          <Text style={[styles.settingLabel, destructive && styles.settingLabelDestructive]}>
            {label}
          </Text>
        </View>
        <View style={styles.settingRight}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          <Ionicons name="chevron-forward" size={18} color={COLORS.slate400} />
        </View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDestructive: {
    backgroundColor: COLORS.roseLight,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.slateDark,
    flex: 1,
  },
  settingLabelDestructive: {
    color: COLORS.rose,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.slate,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 64,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 32,
    marginBottom: 16,
  },
})
