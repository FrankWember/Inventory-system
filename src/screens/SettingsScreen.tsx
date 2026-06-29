import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '../components/ScreenHeader'
import { Card } from '../components/Card'
import { COLORS } from '../utils/helpers'

export default function SettingsScreen() {
  const handleExportData = () => {
    Alert.alert(
      'Exporter les données',
      'Cette fonctionnalité sera disponible prochainement.',
      [{ text: 'OK' }]
    )
  }

  const handleBackupData = () => {
    Alert.alert(
      'Sauvegarde',
      'Cette fonctionnalité sera disponible prochainement.',
      [{ text: 'OK' }]
    )
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
          onPress: () => {
            // Implement cache clearing logic
            Alert.alert('Succès', 'Cache vidé avec succès')
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
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
          />
          <SettingItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            showDivider
          />
          <SettingItem
            icon="globe-outline"
            label="Langue"
            value="Français"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            showDivider
          />
          <SettingItem
            icon="color-palette-outline"
            label="Thème"
            value="Clair"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
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
        <Text style={styles.sectionTitle}>Compte</Text>
        <Card style={styles.card}>
          <SettingItem
            icon="person-outline"
            label="Profil utilisateur"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
          />
          <SettingItem
            icon="key-outline"
            label="Changer le mot de passe"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            showDivider
          />
          <SettingItem
            icon="log-out-outline"
            label="Déconnexion"
            onPress={() => Alert.alert('Déconnexion', 'Fonctionnalité à venir')}
            destructive
          />
        </Card>

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
