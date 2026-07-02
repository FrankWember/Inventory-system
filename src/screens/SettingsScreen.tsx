import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Switch,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenHeader } from '../components/ScreenHeader'
import { LoadingModal } from '../components/LoadingModal'
import { COLORS, FONT, today, fmt, dateLabelLong } from '../utils/helpers'
import { showAlert } from '../utils/appAlert'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { exportData } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { usePdfExport } from '../hooks/usePdfExport'
import { PeriodType } from '../services/pdfService'
import { useTranslation } from '../i18n'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const { user, signOut, updateProfile, resetPassword } = useAuth()
  const { theme, language, notificationsEnabled, barInfo, colors, setTheme, setLanguage, setNotificationsEnabled, updateBarInfo } = useSettings()

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
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || t('settings.defaultUser')
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
      showAlert(t('common.error'), t('settings.saveError'))
    } finally {
      setEditLoading(false)
    }
  }

  const handleNotificationsToggle = async (value: boolean) => {
    try {
      await setNotificationsEnabled(value)
    } catch {
      showAlert(t('common.error'), t('settings.notificationsError'))
    }
  }

  const handleTheme = async (value: 'light' | 'dark') => {
    try {
      await setTheme(value)
    } catch {
      showAlert(t('common.error'), t('settings.themeError'))
    }
  }

  const handleLanguage = async (value: 'fr' | 'en') => {
    try {
      await setLanguage(value)
    } catch {
      showAlert(t('common.error'), t('settings.languageError'))
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
        showAlert(t('common.success'), t('settings.exportSuccess'))
      } else {
        await Share.share({ message: data, title: t('settings.exportShareTitle') })
      }
    } catch {
      showAlert(t('common.error'), t('settings.exportError'))
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
      showAlert(t('common.error'), t('settings.loadDatesError'))
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
      showAlert(t('common.error'), t('settings.loadSessionsError'))
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
      showAlert(
        t('settings.cloudBackupTitle'),
        t('settings.cloudBackupBody', { count: drinks?.length || 0 }),
        [{ text: t('common.ok') }]
      )
    } catch {
      showAlert(t('common.error'), t('settings.cloudBackupError'))
    }
  }


  const handleChangePassword = async () => {
    if (!user) return
    const emailToReset = user.user_metadata?.actual_email || (isPhoneAccount ? null : user.email)
    if (!emailToReset) {
      showAlert(t('settings.info'), t('settings.passwordNeedsEmail'))
      return
    }
    showAlert(
      t('settings.changePassword'),
      t('settings.passwordResetBody', { email: emailToReset }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.send'),
          onPress: async () => {
            try {
              const { error } = await resetPassword(emailToReset)
              if (error) throw error
              showAlert(t('common.success'), t('settings.passwordResetSent'))
            } catch {
              showAlert(t('common.error'), t('settings.passwordResetError'))
            }
          },
        },
      ]
    )
  }

  const handleLogout = () => {
    showAlert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try { await signOut() } catch { showAlert(t('common.error'), t('settings.logoutError')) }
          },
        },
      ]
    )
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={t('settings.title')} />

      {/* Loading Modal for PDF generation */}
      <LoadingModal
        visible={pdfLoading}
        message={t('settings.pdfGenerating')}
        progress={pdfProgress}
      />

      {/* Date Selector Modal */}
      <Modal visible={dateSelectorVisible} transparent animationType="fade" onRequestClose={() => setDateSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>{t('settings.chooseDay')}</Text>
            {loadingDates ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : dates.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: COLORS.slate, textAlign: 'center' }}>
                  {t('settings.noSessions')}
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
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.sessionItemDate}>{dateLabelLong(item.date)}</Text>
                        <Text style={styles.sessionItemRevenue}>{fmt(item.revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.slate} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setDateSelectorVisible(false)}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Selector Modal */}
      <Modal visible={sessionSelectorVisible} transparent animationType="fade" onRequestClose={() => setSessionSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>{t('settings.chooseSession')}</Text>
            {loadingSessions ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
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
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.sessionItemDate}>{session.date}</Text>
                        <Text style={styles.sessionItemRevenue}>{fmt(session.total_revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.slate} />
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
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal !== null} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editModal === 'barName' ? t('settings.establishmentName') : t('settings.displayName')}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={editModal === 'barName' ? t('settings.barNamePlaceholder') : t('settings.displayNamePlaceholder')}
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
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, editLoading && { opacity: 0.6 }]}
                onPress={confirmEdit}
                disabled={editLoading}
                // @ts-ignore - web-only className
                className="glass-primary"
              >
                <Text style={styles.modalConfirmText}>{editLoading ? t('settings.saving') : t('common.save')}</Text>
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
        <SectionTitle label={t('settings.sectionEstablishment')} />
        <SettingsCard>
          <RowItem
            icon="business-outline"
            label={t('settings.barName')}
            value={barInfo?.name || t('settings.notSet')}
            onPress={() => openEdit('barName')}
          />
        </SettingsCard>

        {/* Preferences */}
        <SectionTitle label={t('settings.sectionPreferences')} />
        <SettingsCard>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications-outline" size={19} color={COLORS.primary} />
              </View>
              <Text style={styles.rowLabel}>{t('settings.notifications')}</Text>
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
              <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            </View>
            {/* @ts-ignore - web-only className */}
            <View style={styles.segmented} className="glass-toggle">
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
              <Text style={styles.rowLabel}>{t('settings.theme')}</Text>
            </View>
            {/* @ts-ignore - web-only className */}
            <View style={styles.segmented} className="glass-toggle">
              <SegBtn label={t('settings.themeLight')} icon="sunny-outline" active={theme === 'light'} onPress={() => handleTheme('light')} />
              <SegBtn label={t('settings.themeDark')} icon="moon-outline" active={theme === 'dark'} onPress={() => handleTheme('dark')} />
            </View>
          </View>
        </SettingsCard>

        {/* Data */}
        <SectionTitle label={t('settings.sectionData')} />
        <SettingsCard>
          <RowItem icon="download-outline" label={t('settings.exportJson')} onPress={handleExportData} />
          <View style={styles.separator} />
          <RowItem icon="cloud-upload-outline" label={t('settings.cloudBackup')} onPress={handleBackupData} />
        </SettingsCard>

        {/* PDF Reports */}
        <SectionTitle label={t('settings.sectionPdf')} />
        <Text style={styles.sectionDescription}>
          {t('settings.pdfDescription')}
        </Text>

        {/* Period-based reports */}
        <Text style={styles.subSectionTitle}>{t('settings.byPeriod')}</Text>
        <SettingsCard>
          <RowItem
            icon="document-text-outline"
            label={t('settings.specificDay')}
            onPress={() => handlePdfExport('day')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label={t('settings.last7days')}
            onPress={() => handlePdfExport('7days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="calendar-outline"
            label={t('settings.last30days')}
            onPress={() => handlePdfExport('30days')}
          />
          <View style={styles.separator} />
          <RowItem
            icon="time-outline"
            label={t('settings.allPeriods')}
            onPress={() => handlePdfExport('all')}
          />
        </SettingsCard>

        {/* Session-specific report */}
        <Text style={styles.subSectionTitle}>{t('settings.bySession')}</Text>
        <SettingsCard>
          <RowItem
            icon="receipt-outline"
            label={t('settings.specificSession')}
            value={t('settings.choose')}
            onPress={handleSessionSelectorOpen}
          />
        </SettingsCard>

        {/* Account */}
        {user && (
          <>
            <SectionTitle label={t('settings.sectionAccount')} />
            <SettingsCard>
              <RowItem icon="key-outline" label={t('settings.changePassword')} onPress={handleChangePassword} />
              <View style={styles.separator} />
              <RowItem icon="log-out-outline" label={t('settings.logout')} destructive onPress={handleLogout} />
            </SettingsCard>
          </>
        )}

        {/* About */}
        <SectionTitle label={t('settings.sectionApp')} />
        <SettingsCard>
          <View style={styles.aboutRow}>
            <View style={styles.iconBox}>
              <Ionicons name="information-circle-outline" size={19} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{barInfo?.name || 'BarTrack'}</Text>
              <Text style={styles.aboutSub}>{t('settings.versionLine')}</Text>
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
      className={active ? "glass-toggle-active" : ""}
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
  sectionDescription: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginBottom: 12,
    marginLeft: 2,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: COLORS.slateDark,
    marginBottom: 8,
    marginTop: 12,
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
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionItemDate: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: COLORS.slateDark,
  },
  sessionItemRevenue: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginTop: 2,
  },
})
