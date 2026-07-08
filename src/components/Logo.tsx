// BarTrack logo mark — the martini-glass + "BT" symbol, matching the app
// launcher icon (assets/icon.png). Vector (react-native-svg) so it stays crisp
// at any size and can be tinted to match the surrounding theme.
import React from 'react'
import Svg, { Polygon, Rect, Text as SvgText } from 'react-native-svg'
import { COLORS } from '../utils/helpers'

type LogoProps = {
  size?: number
  color?: string
}

export function Logo({ size = 28, color = COLORS.primary }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* bowl */}
      <Polygon points="24,14 76,14 50,44" fill={color} />
      {/* stem */}
      <Rect x={47} y={44} width={6} height={20} fill={color} />
      {/* base */}
      <Rect x={34} y={63} width={32} height={6} rx={2} fill={color} />
      {/* BT wordmark */}
      <SvgText
        x={50}
        y={96}
        fill={color}
        fontSize={30}
        fontWeight="bold"
        textAnchor="middle"
      >
        BT
      </SvgText>
    </Svg>
  )
}

export default Logo
