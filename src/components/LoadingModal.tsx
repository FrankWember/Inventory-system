import React, { useMemo } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { FONT, ThemeColors } from '../utils/helpers'

interface LoadingModalProps {
  visible: boolean
  message?: string
  progress?: number
}

export function LoadingModal({ visible, message = 'Chargement...', progress }: LoadingModalProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>{message}</Text>
          {progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(4px)',
      },
    }),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
      },
    }),
  },
  message: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: colors.slateDark,
    marginTop: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    ...Platform.select({
      web: {
        transition: 'width 0.3s ease',
      },
    }),
  },
  progressText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: colors.slate,
    textAlign: 'center',
  },
})
