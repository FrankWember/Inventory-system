import React, { useMemo, useEffect, useRef } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { View, Animated, StyleSheet, ViewStyle, ScrollView } from 'react-native'
import { RADIUS, SPACE, shadow, ThemeColors } from '../utils/helpers'

export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={[styles.card, { minHeight: height }]}>
      <Skeleton style={{ width: '40%', height: 12, marginBottom: 12 }} />
      <Skeleton style={{ width: '70%', height: 20 }} />
    </View>
  )
}

/** Full-screen skeleton for list/dashboard screens. */
export function ScreenSkeleton({ variant = 'list' }: { variant?: 'list' | 'dashboard' | 'grid' }) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACE.lg, flexGrow: 1 }}
        scrollEnabled={false}
      >
      {variant === 'dashboard' && (
        <>
          {/* Stats row */}
          <View style={styles.row}>
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
          </View>

          {/* À surveiller section */}
          <View style={[styles.card, { height: 240, marginBottom: SPACE.md }]}>
            <Skeleton style={{ width: 100, height: 14, marginBottom: 16 }} />
            <Skeleton style={{ width: '100%', height: 50, marginBottom: 12 }} />
            <Skeleton style={{ width: '100%', height: 50, marginBottom: 12 }} />
            <Skeleton style={{ width: '100%', height: 50 }} />
          </View>

          {/* Meilleures ventes section */}
          <View style={[styles.card, { height: 280 }]}>
            <Skeleton style={{ width: 120, height: 14, marginBottom: 16 }} />
            <Skeleton style={{ width: '100%', height: 44, marginBottom: 12 }} />
            <Skeleton style={{ width: '100%', height: 44, marginBottom: 12 }} />
            <Skeleton style={{ width: '100%', height: 44, marginBottom: 12 }} />
            <Skeleton style={{ width: '100%', height: 44 }} />
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
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  base: { backgroundColor: colors.border, borderRadius: RADIUS.sm },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: RADIUS.md,
    padding: SPACE.lg,
    marginBottom: SPACE.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(1),
  },
  row: { flexDirection: 'row', gap: SPACE.sm },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  gridCell: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(1),
  },
})
