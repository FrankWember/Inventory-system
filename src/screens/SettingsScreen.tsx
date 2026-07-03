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
import { FONT, today, fmt, dateLabelLong } from '../utils/helpers'
import { requestNotificationPermission } from '../utils/notifications'
import { LIGHT_COLORS } from '../styles/theme'
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
      // Turning ON: secure browser permission (a user gesture backs this request).
      // The periodic engine (useBusinessNotifications) then sends the updates.
      if (value) {
        const permission = await requestNotificationPermission()
        if (permission === 'unsupported') {
          showAlert(t('settings.notifications'), t('settings.notifUnsupported'))
          return
        }
        if (permission !== 'granted') {
          showAlert(t('settings.notifications'), t('settings.notifDenied'))
          return
        }
        await setNotificationsEnabled(true)
      } else {
        await setNotificationsEnabled(false)
      }
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
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t('settings.title')} colors={colors} />

      {/* Loading Modal for PDF generation */}
      <LoadingModal
        visible={pdfLoading}
        message={t('settings.pdfGenerating')}
        progress={pdfProgress}
        colors={colors}
      />

      {/* Date Selector Modal */}
      <Modal visible={dateSelectorVisible} transparent animationType="fade" onRequestClose={() => setDateSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%', backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.slateDark }]}>{t('settings.chooseDay')}</Text>
            {loadingDates ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : dates.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: colors.slate, textAlign: 'center' }}>
                  {t('settings.noSessions')}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {dates.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.sessionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleDateSelect(item.date)}
                  >
                    <View style={styles.sessionItemLeft}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.sessionItemDate, { color: colors.slateDark }]}>{dateLabelLong(item.date)}</Text>
                        <Text style={[styles.sessionItemRevenue, { color: colors.slate }]}>{fmt(item.revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.border }]}
              onPress={() => setDateSelectorVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.slate }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Selector Modal */}
      <Modal visible={sessionSelectorVisible} transparent animationType="fade" onRequestClose={() => setSessionSelectorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '80%', backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.slateDark }]}>{t('settings.chooseSession')}</Text>
            {loadingSessions ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[styles.sessionItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSessionSelect(session.id)}
                  >
                    <View style={styles.sessionItemLeft}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.sessionItemDate, { color: colors.slateDark }]}>{session.date}</Text>
                        <Text style={[styles.sessionItemRevenue, { color: colors.slate }]}>{fmt(session.total_revenue)}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.border }]}
              onPress={() => setSessionSelectorVisible(false)}
              // @ts-ignore - web-only className
              className="glass-button"
            >
              <Text style={[styles.modalCancelText, { color: colors.slate }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModal !== null} transparent animationType="fade" onRequestClose={() => setEditModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.slateDark }]}>
              {editModal === 'barName' ? t('settings.establishmentName') : t('settings.displayName')}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.slateDark }]}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={editModal === 'barName' ? t('settings.barNamePlaceholder') : t('settings.displayNamePlaceholder')}
              placeholderTextColor={colors.slate}
              onSubmitEditing={confirmEdit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setEditModal(null)}
                disabled={editLoading}
                // @ts-ignore - web-only className
                className="glass-button"
              >
                <Text style={[styles.modalCancelText, { color: colors.slate }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.primary }, editLoading && { opacity: 0.6 }]}
                onPress={confirmEdit}
                disabled={editLoading}
                // @ts-ignore - web-only className
                className="glass-primary"
              >
                <Text style={[styles.modalConfirmText, { color: colors.white }]}>{editLoading ? t('settings.saving') : t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        {user && (
          <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <TouchableOpacity
                style={styles.profileNameRow}
                onPress={() => openEdit('displayName')}
                activeOpacity={0.7}
              >
                <Text style={[styles.profileName, { color: colors.slateDark }]}>{displayName}</Text>
                <Ionicons name="pencil" size={14} color={colors.slate} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
              {phoneNumber ? (
                <Text style={[styles.profileSub, { color: colors.slate }]}>{phoneNumber}</Text>
              ) : null}
              {actualEmail ? (
                <Text style={[styles.profileSub, { color: colors.slate }]}>{actualEmail}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Bar Info */}
        <SectionTitle label={t('settings.sectionEstablishment')} colors={colors} />
        <SettingsCard colors={colors}>
          <RowItem
            icon="business-outline"
            label={t('settings.barName')}
            value={barInfo?.name || t('settings.notSet')}
            onPress={() => openEdit('barName')}
            colors={colors}
          />
        </SettingsCard>

        {/* Preferences */}
        <SectionTitle label={t('settings.sectionPreferences')} colors={colors} />
        <SettingsCard colors={colors}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="notifications-outline" size={19} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.slateDark }]}>{t('settings.notifications')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {notificationsSupported() && (
            <TouchableOpacity
              style={[styles.notifButton, { backgroundColor: colors.primary + 'F0' }, sendingNotif && { opacity: 0.7 }]}
              onPress={sendBusinessUpdate}
              disabled={sendingNotif}
              activeOpacity={0.85}
            >
              {sendingNotif ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="paper-plane-outline" size={16} color={colors.white} />
              )}
              <Text style={[styles.notifButtonText, { color: colors.white }]}>
                {sendingNotif ? t('settings.notifSending') : t('settings.notifSendNow')}
              </Text>
            </TouchableOpacity>
          )}

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="globe-outline" size={19} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.slateDark }]}>{t('settings.language')}</Text>
            </View>
            {/* @ts-ignore - web-only className */}
            <View style={[styles.segmented, { backgroundColor: colors.surface }]} className="glass-toggle">
              <SegBtn label="FR" active={language === 'fr'} onPress={() => handleLanguage('fr')} colors={colors} />
              <SegBtn label="EN" active={language === 'en'} onPress={() => handleLanguage('en')} colors={colors} />
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.iconBox}>
                <Ionicons name="color-palette-outline" size={19} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.slateDark }]}>{t('settings.theme')}</Text>
            </View>
            {/* @ts-ignore - web-only className */}
            <View style={[styles.segmented, { backgroundColor: colors.surface }]} className="glass-toggle">
              <SegBtn label={t('settings.themeLight')} icon="sunny-outline" active={theme === 'light'} onPress={() => handleTheme('light')} colors={colors} />
              <SegBtn label={t('settings.themeDark')} icon="moon-outline" active={theme === 'dark'} onPress={() => handleTheme('dark')} colors={colors} />
            </View>
          </View>
        </SettingsCard>

        {/* Data */}
        <SectionTitle label={t('settings.sectionData')} colors={colors} />
        <SettingsCard colors={colors}>
          <RowItem icon="download-outline" label={t('settings.exportJson')} onPress={handleExportData} colors={colors} />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <RowItem icon="cloud-upload-outline" label={t('settings.cloudBackup')} onPress={handleBackupData} colors={colors} />
        </SettingsCard>

        {/* PDF Reports */}
        <SectionTitle label={t('settings.sectionPdf')} colors={colors} />
        <Text style={[styles.sectionDescription, { color: colors.slate }]}>
          {t('settings.pdfDescription')}
        </Text>

        {/* Period-based reports */}
        <Text style={[styles.subSectionTitle, { color: colors.slateDark }]}>{t('settings.byPeriod')}</Text>
        <SettingsCard colors={colors}>
          <RowItem
            icon="document-text-outline"
            label={t('settings.specificDay')}
            onPress={() => handlePdfExport('day')}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <RowItem
            icon="calendar-outline"
            label={t('settings.last7days')}
            onPress={() => handlePdfExport('7days')}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <RowItem
            icon="calendar-outline"
            label={t('settings.last30days')}
            onPress={() => handlePdfExport('30days')}
            colors={colors}
          />
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <RowItem
            icon="time-outline"
            label={t('settings.allPeriods')}
            onPress={() => handlePdfExport('all')}
            colors={colors}
          />
        </SettingsCard>

        {/* Session-specific report */}
        <Text style={[styles.subSectionTitle, { color: colors.slateDark }]}>{t('settings.bySession')}</Text>
        <SettingsCard colors={colors}>
          <RowItem
            icon="receipt-outline"
            label={t('settings.specificSession')}
            value={t('settings.choose')}
            onPress={handleSessionSelectorOpen}
            colors={colors}
          />
        </SettingsCard>

        {/* Account */}
        {user && (
          <>
            <SectionTitle label={t('settings.sectionAccount')} colors={colors} />
            <SettingsCard colors={colors}>
              <RowItem icon="key-outline" label={t('settings.changePassword')} onPress={handleChangePassword} colors={colors} />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <RowItem icon="log-out-outline" label={t('settings.logout')} destructive onPress={handleLogout} colors={colors} />
            </SettingsCard>
          </>
        )}

        {/* About */}
        <SectionTitle label={t('settings.sectionApp')} colors={colors} />
        <SettingsCard colors={colors}>
          <View style={styles.aboutRow}>
            <View style={styles.iconBox}>
              <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.slateDark }]}>{barInfo?.name || 'BarTrack'}</Text>
              <Text style={[styles.aboutSub, { color: colors.slate }]}>{t('settings.versionLine')}</Text>
            </View>
          </View>
        </SettingsCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

function SectionTitle({ label, colors }: { label: string; colors: typeof LIGHT_COLORS }) {
  return <Text style={[styles.sectionTitle, { color: colors.slate }]}>{label}</Text>
}

function SettingsCard({ children, colors }: { children: React.ReactNode; colors: typeof LIGHT_COLORS }) {
  return <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>
}

function RowItem({
  icon,
  label,
  value,
  onPress,
  destructive,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string
  onPress: () => void
  destructive?: boolean
  colors: typeof LIGHT_COLORS
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, destructive && styles.iconBoxDestructive]}>
          <Ionicons name={icon} size={19} color={destructive ? colors.rose : colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: destructive ? colors.rose : colors.slateDark }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.slate }]} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.slate} />
      </View>
    </TouchableOpacity>
  )
}

function SegBtn({ label, icon, active, onPress, colors }: { label: string; icon?: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void; colors: typeof LIGHT_COLORS }) {
  return (
    <TouchableOpacity
      style={[styles.segBtn, active && [styles.segBtnActive, { backgroundColor: colors.primary }]]}
      onPress={onPress}
      activeOpacity={0.8}
      // @ts-ignore - web-only className
      className={active ? "glass-toggle-active" : ""}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.white : colors.slate}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.segBtnText, { color: active ? colors.white : colors.slate }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { fontSize: 20, fontFamily: FONT.bold },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  profileName: { fontSize: 16, fontFamily: FONT.semibold },
  profileSub: { fontSize: 13, fontFamily: FONT.regular, marginTop: 1 },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 2,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: FONT.regular,
    marginBottom: 12,
    marginLeft: 2,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 2,
  },
  card: {
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
    }),
  },
  iconBoxDestructive: {
    backgroundColor: '#FFF1F2',
  },
  rowLabel: { fontSize: 15, fontFamily: FONT.medium, flex: 1 },
  rowValue: { fontSize: 13, fontFamily: FONT.regular, maxWidth: 120 },
  separator: { height: 1, marginLeft: 62 },

  // Segmented control
  segmented: {
    flexDirection: 'row',
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
  segBtnText: { fontSize: 12, fontFamily: FONT.semibold },
  segBtnTextActive: {},
  notifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    // Native depth (RNW ignores shadow* on web, so the glassy look below is web-only).
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    // Apple "liquid glass": frosted backdrop + specular top highlight + soft coloured
    // glow. Applied inline because RNW does not forward the .glass-* className to the DOM.
    ...Platform.select({
      web: {
        cursor: 'pointer',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        boxShadow:
          '0 8px 28px rgba(24,119,242,0.36), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.14)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
      } as any,
    }),
  },
  notifButtonText: { fontSize: 14, fontFamily: FONT.semibold, letterSpacing: 0.2 },

  // About row
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  aboutSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 1 },

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
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  modalTitle: { fontSize: 17, fontFamily: FONT.semibold, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONT.regular,
    marginBottom: 20,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
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
  modalCancelText: { fontSize: 15, fontFamily: FONT.medium },
  modalConfirm: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
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
  modalConfirmText: { fontSize: 15, fontFamily: FONT.semibold },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  sessionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionItemDate: {
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  sessionItemRevenue: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 2,
  },
})
