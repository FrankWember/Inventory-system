// Web notifications — a thin wrapper around the browser Notification API used to
// push important business updates (low stock, last session revenue) to the user.
// Native platforms fall back to "unsupported"; the caller shows an in-app alert.
import { Platform } from 'react-native'

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

// The RN tsconfig ships no DOM lib, so reach the browser Notification API through
// a loosely-typed global handle rather than the ambient `window`/`Notification`.
const g: any = typeof globalThis !== 'undefined' ? globalThis : {}

export function notificationsSupported(): boolean {
  return Platform.OS === 'web' && typeof g.window !== 'undefined' && 'Notification' in g.window
}

export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return 'unsupported'
  return g.Notification.permission
}

/** Ask the browser for permission (idempotent — resolves instantly if already decided). */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return 'unsupported'
  const N = g.Notification
  if (N.permission === 'granted') return 'granted'
  if (N.permission === 'denied') return 'denied'
  try {
    return await N.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Show a single OS notification. Returns false if unsupported or not granted. */
export function showNotification(title: string, body: string): boolean {
  if (!notificationsSupported() || g.Notification.permission !== 'granted') return false
  try {
    const notification = new g.Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      // Collapse repeat business updates into one entry instead of stacking.
      tag: 'bartrack-business-update',
    })
    notification.onclick = () => {
      try { g.window.focus() } catch {}
      notification.close()
    }
    return true
  } catch {
    return false
  }
}
