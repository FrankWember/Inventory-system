import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  Share,
  Modal,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '../components/ScreenHeader'
import { LoadingModal } from '../components/LoadingModal'
import { COLORS, FONT, today } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { exportData } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { usePdfExport } from '../hooks/usePdfExport'
import { PeriodType } from '../services/pdfService'

export default function SettingsScreen() {
  const { user, signOut, updateProfile } = useAuth()
  const { theme, language, notificationsEnabled, barInfo, setTheme, setLanguage, setNotificationsEnabled, updateBarInfo } = useSettings()

  const [editModal, setEditModal] = useState<null | 'barName' | 'displayName'>(null)
  const [editValue, setEditValue] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())

  const { loading: pdfLoading, progress: pdfProgress, generatePdf } = usePdfExport({ barName: barInfo?.name || 'BarTrack' })

  const isPhoneAccount = user?.email?.includes('@phone.bartrack.app')
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Utilisateur'
  const phoneNumber = user?.user_metadata?.phone
  const actualEmail = user?.user_metadata?.actual_email || (isPhoneAccount ? null : user?.email)

  // Derived initials for avatar
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const openEdit = (type: 'barName' | 'displayName') => {
    setEditModal(type)
    setEditValue(type === 'barName' ? (barInfo?.name || '') : displayName)
  }

  const confirmEdit = async () => {
    if (!editValue.trim()) return
    setEditLoading(true)
    try {
      if (editModal === 'barName') {
        await updateBarInfo({ name: editValue.trim() })
      } else if (editModal === 'displayName') {
        const { error } = await updateProfile(editValue.trim())
        if (error) throw new Error(error.message)
      }
      setEditModal(null)
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder')
    } finally {
      setEditLoading(false)
    }
  }

  const handleNotificationsToggle = async (value: boolean) => {
    try {
      await setNotificationsEnabled(value)
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier les notifications')
    }
  }

  const handleTheme = async (value: 'light' | 'dark') => {
    try {
      await setTheme(value)
    } catch {
      Alert.alert('Erreur', 'Impossible de changer le thème')
    }
  }

  const handleLanguage = async (value: 'fr' | 'en') => {
    try {
      await setLanguage(value)
    } catch {
      Alert.alert('Erreur', 'Impossible de changer la langue')
    }
  }

  const handleExportData = async () => {
    try {
      const data = await exportData()
      if (Platform.OS === 'web') {
        const blob = new Blob([data])
        const url = URL.createObjectURL(blob)
        const a = (global as any).document?.createElement('a')
        if (a) {
          a.href = url
          a.download = `bartrack-export-${today()}.json`
          a.click()
          URL.revokeObjectURL(url)
        }
        Alert.alert('Succès', 'Données exportées avec succès')
      } else {
        await Share.share({ message: data, title: 'Export BarTrack' })
      }
    } catch {
      Alert.alert('Erreur', 'Impossible d\'exporter les données')
    }
  }

  const handlePdfExport = (periodType: PeriodType) => {
    if (periodType === 'day') {
      setDatePickerVisible(true)
    } else {
      generatePdf(periodType)
    }
  }

  const handleDateConfirm = () => {
    setDatePickerVisible(false)
    generatePdf('day', selectedDate)
  }

  const handleBackupData = async () => {
    try {
      const { data: drinks, error } = await supabase.from('drinks').select('id')
      if (error) throw error
      Alert.alert(
        '☁️ Sauvegarde cloud',
        `Synchronisation active\n${drinks?.length || 0} articles synchronisés`,
        [{ text: 'OK' }]
      )
    } catch {
      Alert.alert('Erreur', 'Impossible d\'accéder à la sauvegarde cloud')
    }
  }


  const handleChangePassword = async () => {
    if (!user) return
    const emailToReset = user.user_metadata?.actual_email || (isPhoneAccount ? null : user.email)
    if (!emailToReset) {
      Alert.alert('Info', 'La réinitialisation par mot de passe nécessite une adresse email associée.')
      return
    }
    Alert.alert(
      'Changer le mot de passe',
      `Un email de réinitialisation sera envoyé à ${emailToReset}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(emailToReset)
              if (error) throw error
              Alert.alert('Succès', 'Email de réinitialisation envoyé')
            } catch {
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
            try { await signOut() } catch { Alert.alert('Erreur', 'Impossible de se déconnecter') }
          },
        },
      ]
    )
  }

  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="Paramètres" />

      {/* Loading Modal for PDF generation */}
      <LoadingModal
        visible={pdfLoading}
        message="Génération du rapport PDF..."
        progress={pdfProgress}
      />

      {/* Date Picker Modal */}
      <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sélectionner une date</Text>
            <TextInput
              style={styles.modalInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.slate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDatePickerVisible(false)}
                // @ts-ignore - web-only className
                className="glass-button"
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleDateConfirm}
                // @ts-ignore - web-only className
                className="glass-primary"
              >
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal !== null} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editModal === 'barName' ? 'Nom de l\'établissement' : 'Nom d\'affichage'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={editModal === 'barName' ? 'Ex: Le BarAfrika' : 'Votre nom'}
              placeholderTextColor={COLORS.slate}
              onSubmitEditing={confirmEdit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModal(null)}
                disabled={editLoading}
                // @ts-ignore - web-only className
                className="glass-button"
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, editLoading && { opacity: 0.6 }]}
                onPress={confirmEdit}
                disabled={editLoading}
                // @ts-ignore - web-only className
                className="glass-primary"
              >
                <Text style={styles.modalConfirmText}>{editLoading ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        {user && (
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <TouchableOpacity
                style={styles.profileNameRow}
                onPress={() => openEdit('displayName')}
                activeOpacity={0.7}
              >
                <Text style={styles.profileName}>{displayName}</Text>
                <Ionicons name="pencil" size={14} color={COLORS.slate} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              {phoneNumber ? (
                <Text style={styles.profileSub}>{phoneNumber}</Text>
              ) : null}
              {actualEmail ? (
                <Text style={styles.profileSub}>{actualEmail}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Bar Info */}
        <SectionTitle label="Établissement" />
        <SettingsCard>
          <RowItem
            icon="business-outline"
            label="Nom du bar"
            value={barInfo?.name || 'Non défini'}
            onPress={() => openEdit('barName')}
          />
        </SettingsCard>

        {/* Preferences */}
        <SectionTitle label="Préférences" />
        <SettingsCard>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications-outline" size={19} color={COLORS.primary} />
              </View>
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="globe-outline" size={19} color={COLORS.primary} />
              </View>
              <Text style={styles.rowLabel}>Langue</Text>
            </View>
            <View style={styles.segmented}>
              <SegBtn label="FR" active={language === 'fr'} onPress={() => handleLanguage('fr')} />
              <SegBtn label="EN" active={language === 'en'} onPress={() => handleLanguage('en')} />
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="color-palette-outline" size={19} color={COLORS.primary} />
              </View>
              <Text style={styles.rowLabel}>Thème</Text>
            </View>
            <View style={styles.segmented}>
              <SegBtn label="Clair" icon="sunny-outline" active={theme === 'light'} onPress={() => handleTheme('light')} />
              <SegBtn label="Sombre" icon="moon-outline" active={theme === 'dark'} onPress={() => handleTheme('dark')} />
            </View>
          </View>
        </SettingsCard>

        {/* Data */}
        <SectionTitle label="Données" />
        <SettingsCard>
          <RowItem icon="download-outline" label="Exporter les données (JSON)" onPress={handleExportData} />
          <View style={styles.separator} />
          <RowItem icon="cloud-upload-outline" label="Sauvegarde cloud" onPress={handleBackupData} />
        </SettingsCard>

        {/* PDF Reports */}
        <SectionTitle label="Rapports PDF" />
        <SettingsCard>
          <RowItem
            icon="document-text-outline"
            label="Rapport d'une journée"
            onPress={() => handlePdfExport('day')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label="Rapport 7 derniers jours"
            onPress={() => handlePdfExport('7days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label="Rapport 30 derniers jours"
            onPress={() => handlePdfExport('30days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="time-outline"
            label="Rapport toutes les périodes"
            onPress={() => handlePdfExport('all')}
          />
        </SettingsCard>

        {/* Account */}
        {user && (
          <>
            <SectionTitle label="Compte" />
            <SettingsCard>
              <RowItem icon="key-outline" label="Changer le mot de passe" onPress={handleChangePassword} />
              <View style={styles.separator} />
              <RowItem icon="log-out-outline" label="Déconnexion" destructive onPress={handleLogout} />
            </SettingsCard>
          </>
        )}

        {/* About */}
        <SectionTitle label="Application" />
        <SettingsCard>
          <View style={styles.aboutRow}>
            <View style={styles.iconBox}>
              <Ionicons name="information-circle-outline" size={19} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{barInfo?.name || 'BarTrack'}</Text>
              <Text style={styles.aboutSub}>Version 1.0.0 · Gestion de bar</Text>
            </View>
          </View>
        </SettingsCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

function RowItem({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string
  onPress: () => void
  destructive?: boolean
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, destructive && styles.iconBoxDestructive]}>
          <Ionicons name={icon} size={19} color={destructive ? COLORS.rose : COLORS.primary} />
        </View>
        <Text style={[styles.rowLabel, destructive && { color: COLORS.rose }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={COLORS.slate} />
      </View>
    </TouchableOpacity>
  )
}

function SegBtn({ label, icon, active, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && styles.segBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
      // @ts-ignore - web-only className
      className={active ? "glass-primary" : ""}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? COLORS.white : COLORS.slate}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    gap: 14,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },
  avatarWrap: {},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: { fontSize: 20, fontFamily: FONT.bold, color: COLORS.primary },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  profileName: { fontSize: 16, fontFamily: FONT.semibold, color: COLORS.slateDark },
  profileSub: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 1 },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: COLORS.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.12)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  iconBoxDestructive: {
    backgroundColor: '#FFF1F2',
  },
  rowLabel: { fontSize: 15, fontFamily: FONT.medium, color: COLORS.slateDark, flex: 1 },
  rowValue: { fontSize: 13, fontFamily: FONT.regular, color: COLORS.slate, maxWidth: 120 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  segBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    ...Platform.select({
      web: {
        transform: 'translateY(-1px)',
      },
    }),
  },
  segBtnText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.slate },
  segBtnTextActive: { color: COLORS.white },

  // About row
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  aboutSub: { fontSize: 12, fontFamily: FONT.regular, color: COLORS.slate, marginTop: 1 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  modalTitle: { fontSize: 17, fontFamily: FONT.semibold, color: COLORS.slateDark, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: COLORS.slateDark,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  modalCancelText: { fontSize: 15, fontFamily: FONT.medium, color: COLORS.slate },
  modalConfirm: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  modalConfirmText: { fontSize: 15, fontFamily: FONT.semibold, color: COLORS.white },
})
