import { Category } from '../types'

// Design tokens live in src/styles/theme.ts — re-export here so every screen
// that imports COLORS from '../utils/helpers' is themed from one source.
export { COLORS, FONT, TYPE, SPACE, RADIUS, shadow, MAX_CONTENT } from '../styles/theme'
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
export const fmt = (n: number): string => {
  return Math.round(n).toLocaleString('fr-FR') + '\u00A0FCFA'
}

/** Full number with French locale — no abbreviation */
export const fmtNum = (n: number): string => {
  return Math.round(n).toLocaleString('fr-FR')
}

/**
 * Compact money for narrow KPI/stat tiles where the full number won't fit
 * (react-native-web ignores adjustsFontSizeToFit). Abbreviates ≥10k to "k"
 * and ≥1M to "M"; smaller amounts stay exact. Full values remain in heroes,
 * ledgers and tables.
 */
export const fmtShort = (n: number): string => {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0M\u00A0FCFA`
  if (a >= 10_000) return `${sign}${Math.round(a / 1000).toLocaleString('fr-FR')}\u00A0k\u00A0FCFA`
  return fmt(n)
}

/** Compact number with no currency — for chart bar labels (currency implied). */
export const fmtShortBare = (n: number): string => {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  if (a >= 1_000) return `${sign}${Math.round(a / 1000).toLocaleString('fr-FR')} k`
  return `${sign}${Math.round(a)}`
}

/** @deprecated Use fmt() or fmtNum() for exact amounts */
export const fmtCompact = (n: number): string => fmtNum(n)

// Date Functions
export const today = (): string => {
  return new Date().toISOString().split('T')[0]
}

export const dateLabel = (iso: string): string => {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export const dateLabelLong = (iso: string): string => {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Cassier (Rack) Formatting for Beers
// 1 cassier = 12 beers
export const formatWithCassiers = (stock: number, category: string): string => {
  if (category !== 'Bière') {
    return `${stock} unités`
  }

  const cassiers = Math.floor(stock / 12)
  const remaining = stock % 12

  if (cassiers === 0) {
    return `${remaining} unité${remaining > 1 ? 's' : ''}`
  }

  if (remaining === 0) {
    return `${cassiers} cassier${cassiers > 1 ? 's' : ''}`
  }

  return `${cassiers} cassier${cassiers > 1 ? 's' : ''} + ${remaining} unité${remaining > 1 ? 's' : ''}`
}

export const formatWithCassiersShort = (stock: number, category: string): string => {
  if (category !== 'Bière') {
    return `${stock}`
  }

  const cassiers = Math.floor(stock / 12)
  const remaining = stock % 12

  if (cassiers === 0) {
    return `${remaining}u`
  }

  if (remaining === 0) {
    return `${cassiers}c`
  }

  return `${cassiers}c + ${remaining}u`
}

// Stock Status
export const getStockStatus = (stock: number, minStock: number): 'rupture' | 'low' | 'medium' | 'ok' => {
  if (stock === 0) return 'rupture'
  if (stock <= minStock) return 'low'
  if (stock <= minStock * 1.5) return 'medium'
  return 'ok'
}

export const getStockPct = (stock: number, minStock: number): number => {
  return Math.min(100, Math.round((stock / Math.max(stock, minStock * 2)) * 100))
}

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
