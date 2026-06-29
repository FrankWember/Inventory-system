// BarTrack Design System — single source of truth
// Warm "hospitality" identity: espresso + amber on warm stone neutrals.

// ─── Color palette ────────────────────────────────────────────────────────
// Observability-first: indigo = brand/interactive only, so green/red/amber stay
// purely semantic for money (profit / loss / low-stock). Graphite frames the UI.
export const palette = {
  // Brand accent — indigo (never used for money meaning)
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',

  // Graphite ink — cool dark neutrals (slate) for hero/sidebar/structure
  ink900: '#0F172A',
  ink800: '#1E293B',
  ink700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',

  // Money semantics
  green500: '#10B981',
  green600: '#059669',
  green100: '#D1FAE5',
  red500: '#F43F5E',
  red600: '#E11D48',
  red100: '#FFE4E6',
  // Facebook blue for primary theme
  blue500: '#1877F2',
  blue600: '#0866FF',
  blue100: '#E7F3FF',
  // Warning/low stock - amber/orange
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber100: '#FEF3C7',
  sky500: '#0EA5E9',
  sky100: '#E0F2FE',
}

// ─── Semantic tokens (used across the app) ────────────────────────────────
export const COLORS = {
  // Brand (interactive / active / structure accents only) - Facebook Blue
  primary: palette.blue500,
  primaryLight: palette.blue100,
  primaryDark: palette.blue600,
  primarySoft: palette.blue100,

  // Success / profit
  emerald: palette.green600,
  emeraldLight: palette.green100,

  // Danger / rupture / loss
  rose: palette.red600,
  roseLight: palette.red100,

  // Warning / low stock
  amber: palette.amber600,
  amberLight: palette.amber100,
  amberDark: '#B45309',

  // Info / accent
  sky: palette.sky500,
  skyLight: palette.sky100,
  violet: palette.indigo500,
  violetLight: palette.indigo100,

  // Neutrals (cool slate)
  slate: palette.slate500,
  slate400: palette.slate400,
  slate600: palette.slate600,
  slateLight: palette.slate100,
  slateDark: palette.ink900,
  ink: palette.ink900,
  inkSoft: palette.ink800,
  gray: palette.slate500,
  grayLight: palette.slate100,

  // Base
  white: palette.white,
  black: '#000000',
  background: palette.slate50,
  surface: palette.slate50,
  card: palette.white,
  border: palette.slate200,
  borderStrong: palette.slate300,
}

// ─── Spacing scale (8pt grid) ─────────────────────────────────────────────
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
}

// ─── Radius scale ─────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
}

// ─── Typography ───────────────────────────────────────────────────────────
// Manrope — clean geometric sans with refined tabular figures for money.
export const FONT = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
}

// Type scale — size / lineHeight / weight intent
export const TYPE = {
  display: { fontFamily: FONT.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h1: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: FONT.regular, fontSize: 14, lineHeight: 20 },
  bodyMedium: { fontFamily: FONT.medium, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: FONT.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  // Numbers — tabular figures so columns align
  metric: { fontFamily: FONT.extrabold, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums' as const], letterSpacing: -0.5 },
  money: { fontFamily: FONT.semibold, fontVariant: ['tabular-nums' as const] },
}

// ─── Elevation ────────────────────────────────────────────────────────────
import { Platform } from 'react-native'

export const shadow = (level: 1 | 2 | 3 = 1) => {
  const map = {
    1: { o: 0.05, r: 4, y: 1, e: 1 },
    2: { o: 0.07, r: 10, y: 3, e: 3 },
    3: { o: 0.1, r: 20, y: 6, e: 6 },
  }
  const s = map[level]
  return Platform.select({
    web: { boxShadow: `0 ${s.y}px ${s.r}px rgba(28,25,23,${s.o})` },
    default: {
      shadowColor: '#1C1917',
      shadowOffset: { width: 0, height: s.y },
      shadowOpacity: s.o,
      shadowRadius: s.r,
      elevation: s.e,
    },
  }) as object
}

export const MAX_CONTENT = 1100 // desktop content max-width
