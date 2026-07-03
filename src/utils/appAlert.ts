import { Alert, Platform } from 'react-native'

// react-native-web's Alert is a no-op stub: dialogs never render and button
// callbacks never fire. Historically this helper fell back to the browser's
// native window.alert/confirm on web, which looks nothing like the app.
//
// Now every alert/confirm is rendered by <AlertHost /> (mounted once at the app
// root) as a branded BarTrack modal. This module is the imperative bridge:
// showAlert() publishes a request that the mounted host displays. Call sites are
// unchanged — they keep calling showAlert()/showConfirm() exactly as before.

export interface AppAlertButton {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

export interface AlertRequest {
  id: number
  title: string
  message?: string
  buttons: AppAlertButton[]
}

type Listener = (req: AlertRequest) => void

let listener: Listener | null = null
let pending: AlertRequest[] = []
let counter = 0

/**
 * Called by <AlertHost /> on mount to receive alert requests. Any requests that
 * fired before the host mounted are flushed immediately so nothing is lost.
 * Pass null on unmount to detach.
 */
export function subscribeToAlerts(fn: Listener | null): void {
  listener = fn
  if (fn && pending.length) {
    const flush = pending
    pending = []
    flush.forEach(fn)
  }
}

/**
 * Drop-in replacement for Alert.alert that renders a branded BarTrack dialog.
 * - No buttons → a single "OK" button.
 * - The dialog handles one/two/three button layouts and destructive/cancel styling.
 */
export function showAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  const req: AlertRequest = {
    id: ++counter,
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
  }

  if (listener) {
    listener(req)
    return
  }

  // Host not mounted yet — queue it. As a last resort on native (where the host
  // is guaranteed present at root but timing could theoretically race), the OS
  // dialog is a safe fallback; on web we simply wait for the host to flush.
  pending.push(req)
  if (Platform.OS !== 'web' && !listener) {
    // Native has a real Alert; use it directly if nothing consumes the queue.
    // The host's flush also runs, so guard against a double-render by clearing.
    const idx = pending.indexOf(req)
    if (idx !== -1) pending.splice(idx, 1)
    Alert.alert(title, message, req.buttons)
  }
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
