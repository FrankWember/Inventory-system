import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, ViewStyle, ScrollView } from 'react-native'
import { COLORS, RADIUS, SPACE, shadow } from '../utils/helpers'

export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const opacity = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return <Animated.View style={[styles.base, { opacity }, style]} />
}

function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <View style={[styles.card, { minHeight: height }]}>
      <Skeleton style={{ width: '40%', height: 12, marginBottom: 12 }} />
      <Skeleton style={{ width: '70%', height: 20 }} />
    </View>
  )
}

/** Full-screen skeleton for list/dashboard screens. */
export function ScreenSkeleton({ variant = 'list' }: { variant?: 'list' | 'dashboard' | 'grid' }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.surface }}
      contentContainerStyle={{ padding: SPACE.lg }}
      scrollEnabled={false}
    >
      {variant === 'dashboard' && (
        <>
          <View style={[styles.card, { height: 140, marginBottom: SPACE.md }]}>
            <Skeleton style={{ width: 80, height: 12, marginBottom: 16 }} />
            <Skeleton style={{ width: '55%', height: 28, marginBottom: 10 }} />
            <Skeleton style={{ width: '40%', height: 20 }} />
          </View>
          <View style={styles.row}>
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
          </View>
        </>
      )}

      {variant === 'grid' && (
        <View style={styles.gridWrap}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.gridCell}>
              <Skeleton style={{ width: '50%', height: 10, marginBottom: 10 }} />
              <Skeleton style={{ width: '80%', height: 16, marginBottom: 10 }} />
              <Skeleton style={{ width: '100%', height: 6 }} />
            </View>
          ))}
        </View>
      )}

      {variant === 'list' &&
        Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  base: { backgroundColor: COLORS.border, borderRadius: RADIUS.sm },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACE.lg,
    marginBottom: SPACE.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow(1),
  },
  row: { flexDirection: 'row', gap: SPACE.sm },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  gridCell: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow(1),
  },
})
