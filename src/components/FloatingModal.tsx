import React from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, FONT } from '../utils/helpers'

interface FloatingModalProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function FloatingModal({ visible, onClose, title, children }: FloatingModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {title && (
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.slateDark} />
              </TouchableOpacity>
            </View>
          )}
          {children}
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    minHeight: '70%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
})
