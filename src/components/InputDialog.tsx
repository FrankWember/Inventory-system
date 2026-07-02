import React, { useMemo, useState } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { FONT, ThemeColors } from '../utils/helpers'

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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
            placeholderTextColor={colors.slate400}
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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: colors.white,
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
    color: colors.slateDark,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: colors.slate,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: FONT.medium,
    color: colors.slateDark,
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
    backgroundColor: colors.slateLight,
  },
  buttonConfirm: {
    backgroundColor: colors.primary,
  },
  buttonTextCancel: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: colors.slate,
  },
  buttonTextConfirm: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: colors.white,
  },
})
