import React from 'react'
import { Text as RNText, TextInput as RNTextInput, StyleSheet, Platform } from 'react-native'
import { FONT } from './theme'

// Custom fonts don't respond to `fontWeight` (each weight is a separate family),
// so map the weight already in the stylesheet to the matching Manrope family.
// This themes every <Text>/<TextInput> in the app without touching each style.
function pickFamily(weight: unknown): string {
  // On web, use the base font name with CSS font-weight
  if (Platform.OS === 'web') {
    return 'Manrope'
  }

  // On native, use specific font family names
  switch (String(weight)) {
    case '800':
    case '900':
      return FONT.extrabold
    case '700':
    case 'bold':
      return FONT.bold
    case '600':
      return FONT.semibold
    case '500':
      return FONT.medium
    default:
      return FONT.regular
  }
}

let applied = false

export function applyGlobalFont() {
  if (applied) return
  applied = true

  const patch = (Comp: any) => {
    const orig = Comp.render
    if (!orig) return
    Comp.render = function (...args: any[]) {
      const el = orig.apply(this, args)
      if (!el || !el.props) return el
      const s = el.props.style
      const flat = (StyleSheet.flatten(s) || {}) as any
      if (flat.fontFamily) return el // explicit family wins
      const fam = pickFamily(flat.fontWeight)
      // On web, react-native-web's render output carries an already-resolved
      // plain style object — wrapping it in an array makes react-dom apply it
      // by numeric index and throw. Merge into an object in that case; only use
      // an array when the style already is one (native style IDs / arrays).
      // On web, preserve fontWeight; on native, font family name includes weight
      const styleOverride = Platform.OS === 'web'
        ? { fontFamily: fam, fontWeight: flat.fontWeight || 400 }
        : { fontFamily: fam }
      const nextStyle =
        Array.isArray(s) || typeof s === 'number'
          ? [styleOverride, s]
          : { ...styleOverride, ...(s || {}) }
      return React.cloneElement(el, { style: nextStyle })
    }
  }

  patch(RNText)
  patch(RNTextInput)
}
