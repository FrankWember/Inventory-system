import React, { useEffect, useRef } from 'react'
import { Animated, ViewProps } from 'react-native'

interface FadeInProps extends ViewProps {
  children: React.ReactNode
  duration?: number
  delay?: number
}

export function FadeIn({ children, duration = 400, delay = 0, style, ...props }: FadeInProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start()
  }, [duration, delay])

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]} {...props}>
      {children}
    </Animated.View>
  )
}
