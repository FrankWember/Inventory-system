// BarTrack i18n core — PURE (no React/RN imports) so it runs under the Node
// test runner and can be imported anywhere. The React hook (useTranslation)
// lives in ./index which re-exports everything here.
//
// Adding strings: create/extend a namespace file in src/i18n/locales/ that
// default-exports { fr: {...}, en: {...} } with flat keys, then register it in
// NAMESPACES below. Keys are addressed as '<namespace>.<key>'.

import common from './locales/common'
import auth from './locales/auth'
import dashboard from './locales/dashboard'
import inventory from './locales/inventory'
import session from './locales/session'
import stats from './locales/stats'
import settings from './locales/settings'
import misc from './locales/misc'
import onboarding from './locales/onboarding'

export type Lang = 'fr' | 'en'

type Namespace = { fr: Record<string, string>; en: Record<string, string> }

export const NAMESPACES: Record<string, Namespace> = {
  common,
  auth,
  dashboard,
  inventory,
  session,
  stats,
  settings,
  misc,
  onboarding,
}

let currentLang: Lang = 'fr'

/** Set by SettingsContext whenever the language loads or changes. */
export function setLang(lang: Lang): void {
  currentLang = lang
}

export function getLang(): Lang {
  return currentLang
}

/** BCP-47 locale for date formatting. */
export function getLocale(): string {
  return currentLang === 'en' ? 'en-US' : 'fr-FR'
}

/**
 * Translate '<namespace>.<key>'. Falls back to French, then to the key itself
 * (so a missing translation is visible but never crashes).
 * `params` replaces {placeholders}: t('a.b', { name: 'Frank' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dot = key.indexOf('.')
  const ns = dot === -1 ? 'common' : key.slice(0, dot)
  const k = dot === -1 ? key : key.slice(dot + 1)
  const table = NAMESPACES[ns]
  let value = table?.[currentLang]?.[k] ?? table?.fr?.[k] ?? key
  if (params) {
    for (const [p, v] of Object.entries(params)) {
      value = value.split(`{${p}}`).join(String(v))
    }
  }
  return value
}
