import React, { useEffect, useRef } from 'react'
import { Animated, ViewProps } from 'react-native'

interface SlideInProps extends ViewProps {
  children: React.ReactNode
  duration?: number
  delay?: number
  from?: 'right' | 'left'
}

export function SlideIn({ children, duration = 300, delay = 0, from = 'right', style, ...props }: SlideInProps) {
  const slideAnim = useRef(new Animated.Value(from === 'right' ? 100 : -100)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [duration, delay, from])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  )
}
