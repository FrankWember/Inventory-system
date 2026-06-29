import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { COLORS, FONT } from '../utils/helpers'

interface InputDialogProps {
  visible: boolean
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InputDialog({
  visible,
  title,
  message,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue)

  React.useEffect(() => {
    if (visible) {
      setValue(defaultValue)
    }
  }, [visible, defaultValue])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={COLORS.slate400}
            autoFocus
            onSubmitEditing={() => {
              if (value.trim()) {
                onConfirm(value)
              }
            }}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.buttonTextCancel}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonConfirm]}
              onPress={() => {
                if (value.trim()) {
                  onConfirm(value)
                }
              }}
            >
              <Text style={styles.buttonTextConfirm}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: COLORS.slate,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: FONT.medium,
    color: COLORS.slateDark,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: COLORS.slateLight,
  },
  buttonConfirm: {
    backgroundColor: COLORS.primary,
  },
  buttonTextCancel: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: COLORS.slate,
  },
  buttonTextConfirm: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: COLORS.white,
  },
})
