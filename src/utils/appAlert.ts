import { Alert, Platform } from 'react-native'

// react-native-web's Alert is a no-op stub: dialogs never render and button
// callbacks never fire. Every alert/confirm in the app must go through this
// helper so web (the primary platform) gets working feedback via the browser's
// native dialogs while native keeps Alert.alert.

export interface AppAlertButton {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

/**
 * Drop-in replacement for Alert.alert that works on web.
 * - No buttons / one button → informational dialog, then the button's onPress.
 * - Two+ buttons → confirm dialog; OK runs the first non-cancel button,
 *   Cancel runs the cancel button.
 */
export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons)
    return
  }

  const win = (globalThis as any).window
  const text = [title, message].filter(Boolean).join('\n\n')

  if (!buttons || buttons.length <= 1) {
    win?.alert?.(text)
    buttons?.[0]?.onPress?.()
    return
  }

  const cancel = buttons.find(b => b.style === 'cancel')
  const action = buttons.find(b => b.style !== 'cancel') ?? buttons[buttons.length - 1]
  const confirmed: boolean = !!win?.confirm?.(text)
  if (confirmed) action?.onPress?.()
  else cancel?.onPress?.()
}

/** Convenience yes/no confirm. Resolves true when the user confirms. */
export function showConfirm(title: string, message?: string): Promise<boolean> {
  return new Promise(resolve => {
    showAlert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ])
  })
}
