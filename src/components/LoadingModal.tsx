import React from 'react'
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { COLORS, FONT } from '../utils/helpers'

interface LoadingModalProps {
  visible: boolean
  message?: string
  progress?: number
}

export function LoadingModal({ visible, message = 'Chargement...', progress }: LoadingModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.white,
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
    color: COLORS.slateDark,
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
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
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
    color: COLORS.slate,
    textAlign: 'center',
  },
})
