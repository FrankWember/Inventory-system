import { Category } from '../types'

// Design tokens live in src/styles/theme.ts — re-export here so every screen
// that imports COLORS from '../utils/helpers' is themed from one source.
export { COLORS, FONT, TYPE, SPACE, RADIUS, shadow, MAX_CONTENT, getColors, LIGHT_COLORS, DARK_COLORS } from '../styles/theme'
import { COLORS } from '../styles/theme'

// Category colors — distinct hues (not a single indigo ramp) so adjacent slices
// in the category-mix bar/legend are easy to tell apart. All are mid-tone 500-level
// values chosen to stay legible on both the light (white) and dark surfaces. The
// dominant category (Bière) keeps the brand indigo; the rest loosely echo the
// product (juice→amber, water→sky, wine→rose).
export const getCategoryColor = (cat: string): string => {
  const map: Record<string, string> = {
    'Bière': '#6366F1', // indigo
    'Soda': '#F59E0B', // amber
    'Jus': '#10B981', // emerald
    'Eau': '#0EA5E9', // sky
    'Vin': '#F43F5E', // rose
    'Autre': '#94A3B8', // slate
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
import { cassierLabel, stockStatus, purchaseCost } from './calculations'
import { getLocale, getLang } from '../i18n'

/** Rack size for a drink, preferring cassier_quantity over legacy rack_size. */
export const drinkRackSize = (drink: { cassier_quantity?: number | null; rack_size?: number | null }): number => {
  const size = drink.cassier_quantity ?? drink.rack_size ?? 1
  return size >= 1 ? Math.floor(size) : 1
}

/** Crate price for a drink, falling back to unit cost × rack size when unset. */
export const drinkCrateCost = (drink: { cost: number; cassier_cost?: number | null; cassier_quantity?: number | null; rack_size?: number | null }): number => {
  const crateCost = drink.cassier_cost ?? 0
  return crateCost > 0 ? crateCost : drink.cost * drinkRackSize(drink)
}

/** Purchase cost for `units` of a drink, billing full crates at the crate price. */
export const drinkPurchaseCost = (units: number, drink: { cost: number; cassier_cost?: number | null; cassier_quantity?: number | null; rack_size?: number | null }): number =>
  purchaseCost(units, drink.cost, drinkRackSize(drink), drink.cassier_cost)

// Whether to show a crate (cassier) breakdown is decided by the drink's rack size,
// NOT its category: any drink sold in crates (rackSize > 1) — beer, soda, etc. —
// gets the "Xc + Yu" format, and only truly single-unit items (rackSize 1) show
// plain units. The `category` param is kept for call-site compatibility.
export const formatWithCassiers = (stock: number, category: string, rackSize = 1): string => {
  if (rackSize <= 1) {
    return getLang() === 'en' ? `${stock} units` : `${stock} unités`
  }
  return cassierLabel(stock, rackSize, false, getLang())
}

export const formatWithCassiersShort = (stock: number, category: string, rackSize = 1): string => {
  if (rackSize <= 1) {
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
