import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'
import { useTranslation } from '../../i18n'

type Colors = typeof LIGHT_COLORS

interface OnboardingLayoutProps {
  /** 1-based step index; when set, the progress header is shown. */
  step?: number
  totalSteps?: number
  /** Big screen heading. */
  title?: string
  subtitle?: string
  /** Back affordance in the progress header (essential on web — no swipe back). */
  onBack?: () => void
  /** Pinned action bar at the bottom (usually a Button). */
  footer?: React.ReactNode
  /** Max content width on wide screens. */
  maxWidth?: number
  children: React.ReactNode
}

export function OnboardingLayout({
  step,
  totalSteps = 4,
  title,
  subtitle,
  onBack,
  footer,
  maxWidth = 560,
  children,
}: OnboardingLayoutProps) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const showProgress = typeof step === 'number'
  const progress = showProgress ? Math.min(100, Math.max(0, (step! / totalSteps) * 100)) : 0

  return (
    <View style={styles.container}>
      {showProgress && (
        <View style={[styles.progressHeader, { paddingTop: insets.top + SPACE.md }]}>
          <View style={styles.progressTopRow}>
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.back')}
              >
                <Ionicons name="arrow-back" size={20} color={colors.slateDark} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <Text style={styles.stepText}>
              {t('onboarding.step', { current: step!, total: totalSteps })}
            </Text>
            <View style={styles.backSpacer} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.contentWrap, { maxWidth }]}>
          {(title || subtitle) && (
            <View style={styles.heading}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          )}
          <View style={styles.flex}>{children}</View>
        </View>
      </KeyboardAvoidingView>

      {footer && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACE.lg) + SPACE.sm }]}>
          <View style={[styles.footerInner, { maxWidth }]}>{footer}</View>
        </View>
      )}
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    progressHeader: {
      paddingHorizontal: SPACE.xl,
      paddingBottom: SPACE.md,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    progressTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACE.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.pill,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({ web: { cursor: 'pointer' } as object }),
    },
    backSpacer: { width: 36, height: 36 },
    stepText: {
      ...TYPE.caption,
      color: c.primary,
      textTransform: 'uppercase',
    },
    progressTrack: {
      height: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
    },
    contentWrap: {
      flex: 1,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE['2xl'],
    },
    heading: {
      marginBottom: SPACE.lg,
    },
    title: {
      ...TYPE.h1,
      color: c.slateDark,
      marginBottom: SPACE.xs,
    },
    subtitle: {
      ...TYPE.body,
      fontFamily: FONT.regular,
      color: c.slate,
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: SPACE.xl,
      paddingTop: SPACE.lg,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerInner: {
      width: '100%',
      alignSelf: 'center',
    },
  })
}
