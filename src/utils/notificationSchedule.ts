// Pure scheduling helpers for the periodic business-notification engine.
// Kept free of React/Storage/DOM so the cadence logic can be unit-tested.

/** Minimum gap between engagement notifications (~6h → a few times a day, not spammy). */
export const NOTIF_COOLDOWN_MS = 6 * 60 * 60 * 1000

/** How soon after the app opens the engine first checks (feels like a "welcome back" update). */
export const NOTIF_INITIAL_DELAY_MS = 12 * 1000

/** How often the engine re-checks while the app stays open. */
export const NOTIF_CHECK_INTERVAL_MS = 30 * 60 * 1000

/** True when enough time has elapsed since the last notification to send another. */
export function isNotificationDue(lastSentMs: number, nowMs: number, cooldownMs: number = NOTIF_COOLDOWN_MS): boolean {
  if (!Number.isFinite(lastSentMs) || lastSentMs <= 0) return true
  return nowMs - lastSentMs >= cooldownMs
}

/** Pick the current item from a rotating list, wrapping safely on any index. */
export function pickRotating<T>(items: T[], rotation: number): T | undefined {
  if (items.length === 0) return undefined
  const idx = ((Math.floor(rotation) % items.length) + items.length) % items.length
  return items[idx]
}
