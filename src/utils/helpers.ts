import { Category } from '../types'

// Design tokens live in src/styles/theme.ts — re-export here so every screen
// that imports COLORS from '../utils/helpers' is themed from one source.
export { COLORS, FONT, TYPE, SPACE, RADIUS, shadow, MAX_CONTENT, getColors, LIGHT_COLORS, DARK_COLORS } from '../styles/theme'
import { COLORS } from '../styles/theme'

// Category colors — a single tonal indigo→slate ramp keeps charts minimal
// and cohesive rather than rainbow.
export const getCategoryColor = (cat: string): string => {
  const map: Record<string, string> = {
    'Bière': '#3730A3',
    'Soda': '#4F46E5',
    'Jus': '#6366F1',
    'Eau': '#818CF8',
    'Vin': '#A5B4FC',
    'Autre': '#CBD5E1',
  }
  return map[cat] ?? COLORS.slate
}

// Formatting Functions
// All formatters coerce null/undefined/NaN to 0 — a single null column in an
// old database row must never render as "NaN FCFA" in the UI.
const safe = (n: number | null | undefined): number => (Number.isFinite(n as number) ? (n as number) : 0)

export const fmt = (n: number | null | undefined): string => {
  return Math.round(safe(n)).toLocaleString('en-US') + '\u00A0FCFA'
}

/** Full number with commas — no abbreviation */
export const fmtNum = (n: number | null | undefined): string => {
  return Math.round(safe(n)).toLocaleString('en-US')
}

/**
 * Compact money for narrow KPI/stat tiles where the full number won't fit
 * (react-native-web ignores adjustsFontSizeToFit). Abbreviates ≥10k to "k"
 * and ≥1M to "M"; smaller amounts stay exact. Full values remain in heroes,
 * ledgers and tables.
 */
export const fmtShort = (n: number | null | undefined): string => {
  const v = safe(n)
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}\u00A0M\u00A0FCFA`
  if (a >= 10_000) return `${sign}${Math.round(a / 1000).toLocaleString('en-US')}\u00A0k\u00A0FCFA`
  return fmt(v)
}

/** Compact number with no currency — for chart bar labels (currency implied). */
export const fmtShortBare = (n: number | null | undefined): string => {
  const v = safe(n)
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} M`
  if (a >= 1_000) return `${sign}${Math.round(a / 1000).toLocaleString('en-US')} k`
  return `${sign}${Math.round(a)}`
}

/** @deprecated Use fmt() or fmtNum() for exact amounts */
export const fmtCompact = (n: number): string => fmtNum(n)

// Date Functions
// All date functions use local timezone to ensure consistency across the app

/**
 * Returns today's date in YYYY-MM-DD format using local timezone
 */
export const today = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parses an ISO date string (YYYY-MM-DD) as a local date, avoiding timezone conversion issues
 */
export const parseLocalDate = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Converts a Date object to ISO string (YYYY-MM-DD) in local timezone
 */
export const toISODateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const dateLabel = (iso: string): string => {
  const date = parseLocalDate(iso)
  return date.toLocaleDateString(getLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export const dateLabelLong = (iso: string): string => {
  const date = parseLocalDate(iso)
  return date.toLocaleDateString(getLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Cassier (Rack) Formatting for Beers
// Rack size is per-drink (drink.cassier_quantity, falling back to rack_size);
// pass it explicitly — the old version hardcoded 12 and misformatted drinks
// sold in 24- or 6-unit cassiers.
import { cassierLabel, stockStatus } from './calculations'
import { getLocale, getLang } from '../i18n'

/** Rack size for a drink, preferring cassier_quantity over legacy rack_size. */
export const drinkRackSize = (drink: { cassier_quantity?: number | null; rack_size?: number | null }): number => {
  const size = drink.cassier_quantity ?? drink.rack_size ?? 1
  return size >= 1 ? Math.floor(size) : 1
}

export const formatWithCassiers = (stock: number, category: string, rackSize = 12): string => {
  if (category !== 'Bière') {
    return getLang() === 'en' ? `${stock} units` : `${stock} unités`
  }
  return cassierLabel(stock, rackSize, false, getLang())
}

export const formatWithCassiersShort = (stock: number, category: string, rackSize = 12): string => {
  if (category !== 'Bière') {
    return `${stock}`
  }
  return cassierLabel(stock, rackSize, true, getLang())
}

// Stock Status — single source of truth in calculations.ts (treats negative
// stock as rupture, unlike the old copy here that only matched exactly 0).
export const getStockStatus = stockStatus

export const getStockColor = (status: 'rupture' | 'low' | 'medium' | 'ok'): string => {
  switch (status) {
    case 'rupture':
    case 'low':
      return COLORS.rose
    case 'medium':
      return COLORS.primary
    case 'ok':
      return COLORS.primary
  }
}
