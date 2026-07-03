import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
import { FONT } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'
import {
  subscribeToAlerts,
  type AlertRequest,
  type AppAlertButton,
} from '../utils/appAlert'

// Renders branded BarTrack alert/confirm dialogs. Mount ONCE near the app root
// (inside SettingsProvider so it can read the active theme). It subscribes to
// the imperative bridge in ../utils/appAlert — every showAlert()/showConfirm()
// call across the app surfaces here instead of via the browser's native dialog.

// A destructive action makes this a "careful" dialog (warning accent); otherwise
// it's informational.
function accentFor(buttons: AppAlertButton[]) {
  return buttons.some(b => b.style === 'destructive')
    ? { icon: 'alert-circle' as const, tone: 'danger' as const }
    : { icon: 'information-circle' as const, tone: 'info' as const }
}

export function AlertHost() {
  const { colors } = useSettings()
  const [queue, setQueue] = useState<AlertRequest[]>([])
  // Latch onto whichever request is on top so its callbacks survive the exit
  // animation even after we pop it off the queue.
  const closingRef = useRef(false)

  useEffect(() => {
    subscribeToAlerts(req => setQueue(prev => [...prev, req]))
    return () => subscribeToAlerts(null)
  }, [])

  const current = queue[0]

  const dismiss = (btn?: AppAlertButton) => {
    if (closingRef.current) return
    closingRef.current = true
    // Fire the callback first, then remove the dialog on the next tick so the
    // fade-out doesn't swallow rapid consecutive alerts.
    btn?.onPress?.()
    setQueue(prev => prev.slice(1))
    closingRef.current = false
  }

  if (!current) return null

  const { icon, tone } = accentFor(current.buttons)
  const accentColor = tone === 'danger' ? colors.rose : colors.primary
  const accentBg = tone === 'danger' ? colors.roseLight : colors.primaryLight
  const cancelBtn = current.buttons.find(b => b.style === 'cancel')
  // On backdrop / hardware back, treat it as a cancel if one exists, else the
  // sole/last action (informational dismiss). Never silently drop callbacks.
  const backdropBtn = cancelBtn ?? (current.buttons.length === 1 ? current.buttons[0] : undefined)

  // Order buttons so the primary action sits last (right / bottom), cancel first.
  const ordered = [...current.buttons].sort((a, b) => {
    const rank = (s?: string) => (s === 'cancel' ? 0 : s === 'destructive' ? 2 : 1)
    return rank(a.style) - rank(b.style)
  })
  const sideBySide = ordered.length === 2

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => dismiss(backdropBtn)}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => dismiss(backdropBtn)}
        />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <Ionicons name={icon} size={30} color={accentColor} />
          </View>

          <Text style={[styles.title, { color: colors.slateDark }]}>
            {current.title}
          </Text>

          {!!current.message && (
            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.message, { color: colors.slate }]}>
                {current.message}
              </Text>
            </ScrollView>
          )}

          <View style={[styles.actions, sideBySide && styles.actionsRow]}>
            {ordered.map((btn, i) => {
              const variant =
                btn.style === 'destructive'
                  ? 'danger'
                  : btn.style === 'cancel'
                  ? 'outline'
                  : 'primary'
              return (
                <Button
                  key={`${btn.text}-${i}`}
                  variant={variant}
                  onPress={() => dismiss(btn)}
                  style={sideBySide ? styles.actionFlex : styles.actionFull}
                >
                  {btn.text}
                </Button>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 24px 64px rgba(15,23,42,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 32,
        elevation: 24,
      },
    }),
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontFamily: FONT.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageScroll: {
    maxHeight: 220,
    alignSelf: 'stretch',
  },
  messageContent: {
    paddingBottom: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT.regular,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 24,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionFlex: {
    flex: 1,
  },
  actionFull: {
    alignSelf: 'stretch',
  },
})
