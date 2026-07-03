import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, ViewStyle, ScrollView, Dimensions, Platform } from 'react-native'
import { COLORS, RADIUS, SPACE, shadow } from '../utils/helpers'
import { useSettings } from '../contexts/SettingsContext'

// ─── Shimmer primitives ───────────────────────────────────────────────────────
// A soft Apple-style shimmer: a translating highlight band over a muted base,
// synchronized across every placeholder on screen via a shared driver.

const ShimmerContext = React.createContext<Animated.Value | null>(null)

function useSharedShimmer(): Animated.Value {
  const progress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [progress])
  return progress
}

export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const shared = React.useContext(ShimmerContext)
  const local = useRef(new Animated.Value(0)).current
  const progress = shared ?? local

  useEffect(() => {
    if (shared) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(local, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(local, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [shared, local])

  const screenWidth = Dimensions.get('window').width
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  })

  const { colors, theme } = useSettings()
  const bandColor = theme === 'dark'
    ? 'rgba(255,255,255,0.08)'
    : Platform.OS === 'web' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)'

  return (
    <View style={[styles.base, { backgroundColor: colors.border }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <View style={[styles.shimmerBand, { backgroundColor: bandColor }]} />
      </Animated.View>
    </View>
  )
}

// ─── Building blocks matching real UI pieces ─────────────────────────────────

function StatTile() {
  const { colors } = useSettings()
  return (
    <View style={[styles.card, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton style={{ width: '45%', height: 10, marginBottom: 12 }} />
      <Skeleton style={{ width: '70%', height: 22 }} />
    </View>
  )
}

function AlertRow() {
  const { colors } = useSettings()
  return (
    <View style={[styles.alertRow, { borderTopColor: colors.border }]}>
      <Skeleton style={{ width: 4, height: 36, borderRadius: 2 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton style={{ width: '55%', height: 13 }} />
        <Skeleton style={{ width: '35%', height: 10 }} />
      </View>
      <Skeleton style={{ width: 56, height: 14 }} />
    </View>
  )
}

function ChartCard({ height = 220 }: { height?: number }) {
  // Mimics SimpleBarChart: a row of bars of varying heights over a baseline
  const bars = [0.55, 0.8, 0.4, 0.95, 0.65, 0.75, 0.5]
  const { colors } = useSettings()
  return (
    <View style={[styles.card, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton style={{ width: 110, height: 13, marginBottom: 16 }} />
      <View style={[styles.chartArea, { height }]}>
        {bars.map((h, i) => (
          <Skeleton key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 6 }} />
        ))}
      </View>
    </View>
  )
}

function ListRowCard() {
  const { colors } = useSettings()
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton style={{ width: '50%', height: 14 }} />
          <Skeleton style={{ width: '30%', height: 10 }} />
        </View>
        <Skeleton style={{ width: 72, height: 26, borderRadius: 8 }} />
      </View>
      <View style={styles.dividerLine} />
      <View style={styles.rowBetween}>
        <Skeleton style={{ width: '40%', height: 11 }} />
        <Skeleton style={{ width: 110, height: 32, borderRadius: 10 }} />
      </View>
    </View>
  )
}

// ─── Full-screen skeletons — each mirrors its screen's actual layout ─────────

export type SkeletonVariant = 'list' | 'dashboard' | 'grid' | 'session' | 'trends'

export function ScreenSkeleton({ variant = 'list' }: { variant?: SkeletonVariant }) {
  const progress = useSharedShimmer()
  const { colors } = useSettings()

  return (
    <ShimmerContext.Provider value={progress}>
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACE.lg, flexGrow: 1 }}
          scrollEnabled={false}
        >
          {variant === 'dashboard' && (
            <>
              {/* Revenu 7j / Profit 7j tiles */}
              <View style={[styles.row, { marginBottom: SPACE.xl }]}>
                <StatTile />
                <StatTile />
              </View>
              {/* À surveiller */}
              <View style={[styles.card, { marginBottom: SPACE.lg, backgroundColor: colors.card, borderColor: colors.border }]}>
                <Skeleton style={{ width: 110, height: 14, marginBottom: 14 }} />
                <AlertRow />
                <AlertRow />
                <AlertRow />
              </View>
              {/* Profit par jour */}
              <ChartCard height={200} />
            </>
          )}

          {variant === 'grid' && (
            <>
              {/* Valeur stock / Ruptures / Stock bas summary */}
              <View style={[styles.row, { marginBottom: SPACE.md }]}>
                <StatTile />
                <StatTile />
                <StatTile />
              </View>
              {/* Search bar */}
              <Skeleton style={{ width: '100%', height: 44, borderRadius: 14, marginBottom: SPACE.md }} />
              {/* Category chips */}
              <View style={[styles.row, { marginBottom: SPACE.lg }]}>
                {[70, 88, 72, 60].map((w, i) => (
                  <Skeleton key={i} style={{ width: w, height: 34, borderRadius: 20 }} />
                ))}
              </View>
              {/* Drink cards grid */}
              <View style={styles.gridWrap}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={[styles.gridCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.row, { alignItems: 'center', marginBottom: 10 }]}>
                      <Skeleton style={{ width: 8, height: 8, borderRadius: 4 }} />
                      <Skeleton style={{ width: 46, height: 9 }} />
                    </View>
                    <Skeleton style={{ width: '85%', height: 13, marginBottom: 8 }} />
                    <Skeleton style={{ width: '50%', height: 16, marginBottom: 10 }} />
                    <Skeleton style={{ width: '100%', height: 4, borderRadius: 2 }} />
                  </View>
                ))}
              </View>
            </>
          )}

          {variant === 'session' && (
            <>
              {/* Step indicator: progress track + 4 numbered dots */}
              <View style={{ marginBottom: SPACE.xl }}>
                <Skeleton style={{ width: '100%', height: 3, borderRadius: 2, marginBottom: 14 }} />
                <View style={styles.rowBetween}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                      <Skeleton style={{ width: 26, height: 26, borderRadius: 13 }} />
                      <Skeleton style={{ width: 48, height: 9 }} />
                    </View>
                  ))}
                </View>
              </View>
              {/* Hint box */}
              <Skeleton style={{ width: '100%', height: 44, borderRadius: 12, marginBottom: SPACE.md }} />
              {/* Search */}
              <Skeleton style={{ width: '100%', height: 40, borderRadius: 12, marginBottom: SPACE.lg }} />
              {/* Purchase/inventory cards */}
              <ListRowCard />
              <ListRowCard />
              <ListRowCard />
            </>
          )}

          {variant === 'trends' && (
            <>
              {/* 7/30/90 period pills */}
              <View style={[styles.row, { marginBottom: SPACE.md }]}>
                <Skeleton style={{ flex: 1, height: 40, borderRadius: 12 }} />
                <Skeleton style={{ flex: 1, height: 40, borderRadius: 12 }} />
                <Skeleton style={{ flex: 1, height: 40, borderRadius: 12 }} />
              </View>
              {/* KPI tiles */}
              <View style={[styles.row, { marginBottom: SPACE.md }]}>
                <StatTile />
                <StatTile />
                <StatTile />
              </View>
              {/* Charts */}
              <View style={{ marginBottom: SPACE.md }}>
                <ChartCard height={180} />
              </View>
              <ChartCard height={180} />
            </>
          )}

          {variant === 'list' &&
            Array.from({ length: 5 }).map((_, i) => <ListRowCard key={i} />)}
        </ScrollView>
      </View>
    </ShimmerContext.Provider>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  shimmerBand: {
    width: '60%',
    height: '100%',
    alignSelf: 'center',
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)',
    opacity: 0.7,
    transform: [{ skewX: '-18deg' }],
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACE.lg,
    marginBottom: SPACE.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow(1),
  },
  row: { flexDirection: 'row', gap: SPACE.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  dividerLine: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
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
