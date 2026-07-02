import React, { useMemo, useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
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
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '../components/ScreenHeader'
import { LoadingModal } from '../components/LoadingModal'
import { FONT, today, fmt, dateLabelLong, ThemeColors } from '../utils/helpers'
import { useAuth } from '../contexts/AuthContext'
import { exportData } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { usePdfExport } from '../hooks/usePdfExport'
import { PeriodType } from '../services/pdfService'

export default function SettingsScreen() {
  const { user, signOut, updateProfile } = useAuth()
  const { theme, language, notificationsEnabled, barInfo, colors, setTheme, setLanguage, setNotificationsEnabled, updateBarInfo } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [editModal, setEditModal] = useState<null | 'barName' | 'displayName'>(null)
  const [editValue, setEditValue] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [dateSelectorVisible, setDateSelectorVisible] = useState(false)
  const [sessionSelectorVisible, setSessionSelectorVisible] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [dates, setDates] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingDates, setLoadingDates] = useState(false)

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

  const handlePdfExport = async (periodType: PeriodType) => {
    if (periodType === 'day') {
      setDateSelectorVisible(true)
      await loadDates()
    } else {
      generatePdf(periodType, undefined, user?.user_metadata?.display_name || user?.email?.split('@')[0])
    }
  }

  const loadDates = async () => {
    setLoadingDates(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('date, total_revenue')
        .order('date', { ascending: false })

      if (error) throw error

      // Group by date and sum revenue
      const dateMap = new Map<string, number>()
      data?.forEach((session: any) => {
        const existing = dateMap.get(session.date) || 0
        dateMap.set(session.date, existing + session.total_revenue)
      })

      const uniqueDates = Array.from(dateMap.entries()).map(([date, revenue]) => ({
        date,
        revenue
      }))

      setDates(uniqueDates)
    } catch (error) {
      console.error('Error loading dates:', error)
      Alert.alert('Erreur', 'Impossible de charger les dates')
    } finally {
      setLoadingDates(false)
    }
  }

  const handleDateSelect = (date: string) => {
    setDateSelectorVisible(false)
    generatePdf('day', date, user?.user_metadata?.display_name || user?.email?.split('@')[0])
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      Alert.alert('Erreur', 'Impossible de charger les sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleSessionSelectorOpen = async () => {
    setSessionSelectorVisible(true)
    await loadSessions()
  }

  const handleSessionSelect = (sessionId: string) => {
    setSessionSelectorVisible(false)
    generatePdf('session', sessionId, user?.user_metadata?.display_name || user?.email?.split('@')[0])
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
    <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
      <ScreenHeader title="Paramètres" />

      {/* Loading Modal for PDF generation */}
      <LoadingModal
        visible={pdfLoading}
        message="Génération du rapport PDF..."
        progress={pdfProgress}
      />

      {/* Date Selector Modal */}
      <Modal visible={dateSelectorVisible} transparent animationType="fade" onRequestClose={() => setDateSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Choisir une journée</Text>
            {loadingDates ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : dates.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: colors.slate, textAlign: 'center' }}>
                  Aucune session enregistrée
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {dates.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sessionItem}
                    onPress={() => handleDateSelect(item.date)}
                  >
                    <View style={styles.sessionItemLeft}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.sessionItemDate}>{dateLabelLong(item.date)}</Text>
                        <Text style={styles.sessionItemRevenue}>{fmt(item.revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setDateSelectorVisible(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Selector Modal */}
      <Modal visible={sessionSelectorVisible} transparent animationType="fade" onRequestClose={() => setSessionSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Choisir une session</Text>
            {loadingSessions ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionItem}
                    onPress={() => handleSessionSelect(session.id)}
                  >
                    <View style={styles.sessionItemLeft}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.sessionItemDate}>{session.date}</Text>
                        <Text style={styles.sessionItemRevenue}>{fmt(session.total_revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setSessionSelectorVisible(false)}
              // @ts-ignore - web-only className
              className="glass-button"
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
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
              placeholderTextColor={colors.slate}
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
                <Ionicons name="pencil" size={14} color={colors.slate} style={{ marginLeft: 6 }} />
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
                <Ionicons name="notifications-outline" size={19} color={colors.primary} />
              </View>
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="globe-outline" size={19} color={colors.primary} />
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
                <Ionicons name="color-palette-outline" size={19} color={colors.primary} />
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
        <Text style={styles.sectionDescription}>
          Générez des rapports détaillés avec graphiques et statistiques
        </Text>

        {/* Period-based reports */}
        <Text style={styles.subSectionTitle}>Par période</Text>
        <SettingsCard>
          <RowItem
            icon="document-text-outline"
            label="Journée spécifique"
            onPress={() => handlePdfExport('day')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label="7 derniers jours"
            onPress={() => handlePdfExport('7days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label="30 derniers jours"
            onPress={() => handlePdfExport('30days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="time-outline"
            label="Toutes les périodes"
            onPress={() => handlePdfExport('all')}
          />
        </SettingsCard>

        {/* Session-specific report */}
        <Text style={styles.subSectionTitle}>Par session</Text>
        <SettingsCard>
          <RowItem
            icon="receipt-outline"
            label="Session spécifique"
            value="Choisir..."
            onPress={handleSessionSelectorOpen}
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
              <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return <Text style={styles.sectionTitle}>{label}</Text>
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, destructive && styles.iconBoxDestructive]}>
          <Ionicons name={icon} size={19} color={destructive ? colors.rose : colors.primary} />
        </View>
        <Text style={[styles.rowLabel, destructive && { color: colors.rose }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.slate} />
      </View>
    </TouchableOpacity>
  )
}

function SegBtn({ label, icon, active, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
          color={active ? colors.white : colors.slate}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarText: { fontSize: 20, fontFamily: FONT.bold, color: colors.primary },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  profileName: { fontSize: 16, fontFamily: FONT.semibold, color: colors.slateDark },
  profileSub: { fontSize: 13, fontFamily: FONT.regular, color: colors.slate, marginTop: 1 },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    color: colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 2,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: colors.slate,
    marginBottom: 12,
    marginLeft: 2,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.glass,
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
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  iconBoxDestructive: {
    backgroundColor: colors.roseLight,
  },
  rowLabel: { fontSize: 15, fontFamily: FONT.medium, color: colors.slateDark, flex: 1 },
  rowValue: { fontSize: 13, fontFamily: FONT.regular, color: colors.slate, maxWidth: 120 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 62 },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
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
  segBtnText: { fontSize: 12, fontFamily: FONT.semibold, color: colors.slate },
  segBtnTextActive: { color: colors.white },

  // About row
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  aboutSub: { fontSize: 12, fontFamily: FONT.regular, color: colors.slate, marginTop: 1 },

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
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  modalTitle: { fontSize: 17, fontFamily: FONT.semibold, color: colors.slateDark, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONT.regular,
    color: colors.slateDark,
    backgroundColor: colors.surface,
    marginBottom: 20,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
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
  modalCancelText: { fontSize: 15, fontFamily: FONT.medium, color: colors.slate },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
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
  modalConfirmText: { fontSize: 15, fontFamily: FONT.semibold, color: colors.white },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionItemDate: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
  },
  sessionItemRevenue: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: colors.slate,
    marginTop: 2,
  },
})
