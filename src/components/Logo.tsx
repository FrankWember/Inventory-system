// BarTrack logo mark — the martini-glass symbol from the app icon.
// Vector (react-native-svg) so it stays crisp at any size and can be tinted
// to match the surrounding theme. The "BarTrack" wordmark is rendered as text
// alongside this mark at each call site, so the mark itself stays text-free
// and legible at small sizes.
import React from 'react'
import Svg, { Polygon, Rect } from 'react-native-svg'
import { COLORS } from '../utils/helpers'

type LogoProps = {
  size?: number
  color?: string
}

export function Logo({ size = 28, color = COLORS.primary }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* bowl */}
      <Polygon points="22,24 78,24 50,58" fill={color} />
      {/* stem */}
      <Rect x={47} y={58} width={6} height={26} fill={color} />
      {/* base */}
      <Rect x={32} y={83} width={36} height={7} rx={3} fill={color} />
    </Svg>
  )
}

export default Logo
