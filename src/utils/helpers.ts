import { Category } from '../types'

// Color Constants - Minimalist Professional Palette
export const COLORS = {
  // Primary - Deep Blue (professional, trustworthy)
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1E40AF',

  // Success - Green
  emerald: '#059669',
  emeraldLight: '#D1FAE5',

  // Error/Danger - Red
  rose: '#DC2626',
  roseLight: '#FEE2E2',

  // Warning - Orange
  amber: '#EA580C',
  amberLight: '#FFEDD5',
  amberDark: '#9A3412',

  // Info - Teal (replaces purple)
  sky: '#0891B2',
  skyLight: '#CFFAFE',

  // Accent - Teal (replaces violet)
  violet: '#0891B2',
  violetLight: '#CFFAFE',

  // Neutral/Gray
  slate: '#64748B',
  slateLight: '#F8FAFC',
  slateDark: '#0F172A',
  gray: '#6B7280',
  grayLight: '#F3F4F6',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',
}

// Category Colors - Updated for minimalist palette
export const getCategoryColor = (cat: string): string => {
  const map: Record<string, string> = {
    'Bière': '#EA580C',  // Amber/Orange
    'Soda': '#0891B2',   // Teal
    'Jus': '#059669',    // Emerald
    'Eau': '#2563EB',    // Blue
    'Vin': '#DC2626',    // Rose/Red
    'Autre': '#64748B',  // Slate
  }
  return map[cat] ?? COLORS.slate
}

// Formatting Functions
export const fmt = (n: number): string => {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

/** Full number with French locale — no abbreviation */
export const fmtNum = (n: number): string => {
  return Math.round(n).toLocaleString('fr-FR')
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
      return COLORS.amber
    case 'ok':
      return COLORS.emerald
  }
}
