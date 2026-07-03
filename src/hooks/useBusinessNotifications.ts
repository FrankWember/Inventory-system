import { useEffect } from 'react'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import { useTranslation } from '../i18n'
import { fmt, getStockStatus } from '../utils/helpers'
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  showNotification,
} from '../utils/notifications'
import {
  isNotificationDue,
  pickRotating,
  NOTIF_INITIAL_DELAY_MS,
  NOTIF_CHECK_INTERVAL_MS,
} from '../utils/notificationSchedule'
import {
  getNotificationLastAt,
  setNotificationLastAt,
  getNotificationRotation,
  setNotificationRotation,
} from '../lib/storage'

type Insight = { title: string; body: string }

/**
 * Periodic business-notification engine. While the app is open and notifications
 * are enabled + permitted, it sends one rotating business insight per cooldown
 * window (revenue, profit, reorder recommendations, out-of-stock alerts, stock
 * value) so the owner stays engaged. Fully defensive — never throws into the app.
 */
export function useBusinessNotifications(): void {
  const { user } = useAuth()
  const { notificationsEnabled, barInfo } = useSettings()
  const { t, lang } = useTranslation()

  useEffect(() => {
    if (Platform.OS !== 'web' || !user || !notificationsEnabled || !notificationsSupported()) return

    let cancelled = false

    const buildInsights = async (): Promise<Insight[]> => {
      const [drinksRes, sessionRes] = await Promise.all([
        supabase.from('drinks').select('name, stock, min_stock, cost, active').eq('active', true),
        supabase
          .from('sessions')
          .select('total_revenue, total_profit')
          .eq('closed', true)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      const drinks = drinksRes.data ?? []
      const outOfStock: string[] = []
      const lowStock: string[] = []
      let stockValue = 0
      for (const d of drinks) {
        const status = getStockStatus(d.stock ?? 0, d.min_stock ?? 0)
        if (status === 'rupture') outOfStock.push(d.name)
        else if (status === 'low') lowStock.push(d.name)
        stockValue += (d.stock ?? 0) * (d.cost ?? 0)
      }
      const names = (arr: string[]) => {
        const top = arr.slice(0, 3).join(', ')
        return arr.length > 3 ? `${top}…` : top
      }

      const title = t('settings.notifTitle', { bar: barInfo?.name || 'BarTrack' })
      const lastSession = sessionRes.data
      const insights: Insight[] = []

      if (outOfStock.length) insights.push({ title, body: t('settings.notifOutStockNamed', { items: names(outOfStock) }) })
      if (outOfStock.length || lowStock.length)
        insights.push({ title, body: t('settings.notifReorderLine', { items: names([...outOfStock, ...lowStock]) }) })
      if (lastSession) {
        insights.push({ title, body: t('settings.notifRevenueOnly', { revenue: fmt(lastSession.total_revenue) }) })
        insights.push({ title, body: t('settings.notifProfitOnly', { profit: fmt(lastSession.total_profit) }) })
      }
      insights.push({ title, body: t('settings.notifStockValueLine', { value: fmt(stockValue) }) })
      if (!lastSession && outOfStock.length === 0 && lowStock.length === 0) {
        insights.unshift({ title, body: t('settings.notifStockHealthy') })
      }
      return insights
    }

    const tick = async () => {
      if (cancelled) return
      try {
        // Best-effort permission (succeeds when a recent user gesture is present).
        if (notificationPermission() === 'default') await requestNotificationPermission()
        if (notificationPermission() !== 'granted') return

        const last = await getNotificationLastAt()
        if (!isNotificationDue(last, Date.now())) return

        const insights = await buildInsights()
        if (cancelled || insights.length === 0) return

        const rotation = await getNotificationRotation()
        const insight = pickRotating(insights, rotation)
        if (!insight) return

        if (showNotification(insight.title, insight.body)) {
          await setNotificationLastAt(Date.now())
          await setNotificationRotation(rotation + 1)
        }
      } catch {
        // A notification failure must never surface to the user.
      }
    }

    const startTimer = setTimeout(tick, NOTIF_INITIAL_DELAY_MS)
    const intervalId = setInterval(tick, NOTIF_CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
      clearInterval(intervalId)
    }
  }, [user, notificationsEnabled, lang, barInfo?.name, t])
}
