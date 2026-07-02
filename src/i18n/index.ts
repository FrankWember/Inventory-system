// BarTrack i18n — public entry point.
//
// Usage in components:
//   const { t, lang } = useTranslation()
//   <Text>{t('dashboard.revenue7d')}</Text>
//
// Outside components (helpers, alerts fired from callbacks, detached renderers
// like the PDF document) use the plain t() export — it reads the current
// language set by SettingsContext via the pure core module.
//
// The pure, RN-free logic lives in ./core (unit-tested); this file only adds
// the React hook.

import { useSettings } from '../contexts/SettingsContext'
import { t, getLang, setLang, type Lang } from './core'

export { t, setLang, getLang, getLocale, NAMESPACES, type Lang } from './core'

/**
 * Hook flavour — identical t(), but subscribing to SettingsContext guarantees
 * the component re-renders when the user switches language.
 */
export function useTranslation(): { t: typeof t; lang: Lang } {
  const { language } = useSettings()
  // Keep the module cursor in sync even if a render happens before the context
  // effect runs.
  if (language !== getLang()) setLang(language)
  return { t, lang: language }
}
