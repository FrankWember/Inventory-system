import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Drink, Category } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { StockProgressBar } from '../components/StockProgressBar'
import { ScreenSkeleton } from '../components/Skeleton'
import { FadeIn } from '../components/FadeIn'
import { SlideIn } from '../components/SlideIn'
import EditDrinkScreen from './EditDrinkScreen'
import AddDrinkScreen from './AddDrinkScreen'
import { FloatingModal } from '../components/FloatingModal'
import { useTranslation } from '../i18n'
import { useSettings } from '../contexts/SettingsContext'
import { LIGHT_COLORS } from '../styles/theme'
import {
  FONT,
  fmtShort,
  getStockStatus,
  getStockColor,
  formatWithCassiersShort,
  drinkRackSize,
} from '../utils/helpers'

const GRID_GAP = 12
const GRID_PADDING = 16
const BREAKPOINT = 768

export default function InventoryScreen({ navigation }: any) {
  const { colors } = useSettings()
  const { t } = useTranslation()
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tout')
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)
  const [showAddDrink, setShowAddDrink] = useState(false)
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

  // Calculate responsive columns: mobile 2, tablet 3, desktop 4+
  const getNumColumns = () => {
    if (!isDesktop) return 2
    const availableWidth = (selectedDrinkId || showAddDrink) ? windowWidth / 2 : windowWidth
    if (availableWidth >= 1400) return 5
    if (availableWidth >= 1100) return 4
    if (availableWidth >= 900) return 3
    return 2
  }

  const numColumns = getNumColumns()

  const categories: Array<Category | 'Tout'> = [
    'Tout', 'Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre',
  ]

  // Stable ordering: the grid sorts by urgency (rupture → low → ok), but
  // re-sorting after every stock edit made the card the user just touched jump
  // to a new position. The order is computed on first load / explicit refresh
  // and then FROZEN — edits update values in place, new drinks append at the end.
  const orderRef = useRef<Map<string, number>>(new Map())

  const statusRank: Record<string, number> = { rupture: 0, low: 1, medium: 2, ok: 3 }
  const urgencySort = (a: Drink, b: Drink) => {
    const ra = statusRank[getStockStatus(a.stock, a.min_stock)]
    const rb = statusRank[getStockStatus(b.stock, b.min_stock)]
    return ra !== rb ? ra - rb : a.name.localeCompare(b.name)
  }

  const rememberOrder = (data: Drink[], resort: boolean) => {
    if (resort || orderRef.current.size === 0) {
      orderRef.current = new Map([...data].sort(urgencySort).map((d, i) => [d.id, i]))
      return
    }
    const order = orderRef.current
    let next = order.size
    for (const d of [...data].sort(urgencySort)) {
      if (!order.has(d.id)) order.set(d.id, next++)
    }
  }

  const loadDrinks = async (resort = false) => {
    try {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      rememberOrder(data || [], resort)
      setDrinks(data || [])
    } catch (error) {
      console.error('Error loading drinks:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDrinks(true) }, [])

  useEffect(() => {
    const sub = navigation.addListener('focus', () => loadDrinks(false))
    return sub
  }, [navigation])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width)
    })
    return () => subscription?.remove()
  }, [])

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <ScreenHeader title={t('common.stock')} subtitle={t('common.loading')} colors={colors} />
        <ScreenSkeleton variant="grid" />
      </View>
    )
  }

  const filtered = drinks
    .filter(d => {
      if (!d.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'Tout' && d.category !== categoryFilter) return false
      return true
    })
    // Frozen urgency order (see rememberOrder) so cards don't jump mid-edit.
    .sort((a, b) => (orderRef.current.get(a.id) ?? 9999) - (orderRef.current.get(b.id) ?? 9999))

  const ruptureCount = drinks.filter(d => d.stock === 0).length
  const lowCount = drinks.filter(d => d.stock > 0 && d.stock <= d.min_stock).length
  const alertCount = ruptureCount + lowCount
  // Capital tied up in current stock (cost basis) — a number owners track.
  const stockValue = drinks.reduce((sum, d) => sum + d.stock * d.cost, 0)

  const handleDrinkPress = (drinkId: string) => {
    if (isDesktop) {
      setSelectedDrinkId(drinkId)
    } else {
      navigation.navigate('EditDrink', { drinkId })
    }
  }

  const renderItem = ({ item: drink }: { item: Drink }) => {
    const status = getStockStatus(drink.stock, drink.min_stock)
    const isSelected = isDesktop && selectedDrinkId === drink.id

    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          { backgroundColor: colors.white },
          isSelected && styles.gridCardSelected,
          isSelected && { borderColor: colors.primary, shadowColor: colors.primary }
        ]}
        onPress={() => handleDrinkPress(drink.id)}
        activeOpacity={0.7}
      >
        <View style={styles.gridBody}>
          <View style={styles.gridTop}>
            <View style={[styles.statusDot, { backgroundColor: getStockColor(status) }]} />
            <Text style={[styles.gridCategory, { color: colors.slate }]}>{drink.category}</Text>
          </View>
          <Text style={[styles.gridName, { color: colors.slateDark }]} numberOfLines={2}>{drink.name}</Text>
          <Text style={[styles.gridStock, { color: colors.primary }]}>
            {formatWithCassiersShort(drink.stock, drink.category, drinkRackSize(drink))}
          </Text>
          <StockProgressBar stock={drink.stock} minStock={drink.min_stock} />
          {(status === 'rupture' || status === 'low') && (
            <Text style={[styles.gridAlert, { color: colors.rose }]}>
              {status === 'rupture' ? t('inventory.outOfStock') : t('inventory.lowStock')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const drinkListContent = (
    <>
      <ScreenHeader
        title={t('common.stock')}
        subtitle={t('inventory.refCount', { count: drinks.length })}
        colors={colors}
      />

      <View style={[styles.summaryRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <View style={styles.summaryTile}>
          <Text style={[styles.summaryValue, { color: colors.slateDark }]}>{fmtShort(stockValue)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.slate }]}>{t('inventory.stockValue')}</Text>
        </View>
        <View style={[styles.summaryTile, styles.summaryTileBordered, { borderColor: colors.border }]}>
          <Text style={[styles.summaryValue, { color: ruptureCount > 0 ? colors.rose : colors.slateDark }]}>{ruptureCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.slate }]}>{t('inventory.outages')}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={[styles.summaryValue, { color: lowCount > 0 ? colors.primary : colors.slateDark }]}>{lowCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.slate }]}>{t('inventory.lowStock')}</Text>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.white }]}>
        <Ionicons name="search" size={18} color={colors.slate} />
        <TextInput
          style={[styles.searchInput, { color: colors.slateDark }]}
          placeholder={t('common.search')}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.slate}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(cat => {
          const count = cat === 'Tout' ? drinks.length : drinks.filter(d => d.category === cat).length
          const isActive = categoryFilter === cat
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[
                styles.categoryTab,
                { backgroundColor: colors.white },
                isActive && styles.categoryTabActive,
                isActive && { backgroundColor: colors.primary, shadowColor: colors.primary }
              ]}
              // @ts-ignore - className is web-only
              className={isActive ? "glass-primary" : "glass-button"}
            >
              <Text style={[
                styles.categoryTabText,
                { color: colors.slate },
                isActive && styles.categoryTabTextActive,
                isActive && { color: colors.white }
              ]}>
                {cat === 'Tout' ? t('common.all') : cat} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        numColumns={numColumns}
        key={`grid-${numColumns}`}
        renderItem={renderItem}
        columnWrapperStyle={styles.gridRow}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 72 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDrinks(true) }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.slate }]}>{t('inventory.noDrinksFound')}</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          setSelectedDrinkId(null)
          setShowAddDrink(true)
        }}
        // @ts-ignore - className is web-only
        className="glass-primary"
      >
        <Ionicons name="add" size={28} color={colors.white} style={styles.fabIcon} />
      </TouchableOpacity>
    </>
  )

  if (isDesktop) {
    return (
      <FadeIn style={[styles.desktopContainer, { backgroundColor: colors.surface }]}>
        <View style={[
          styles.desktopLeft,
          { backgroundColor: colors.surface },
          !selectedDrinkId && !showAddDrink && styles.desktopLeftFull
        ]}>
          {drinkListContent}
        </View>
        {selectedDrinkId && (
          <SlideIn style={[styles.desktopRight, { backgroundColor: colors.white, borderLeftColor: colors.border }]} duration={250}>
            <View style={[styles.editHeader, { borderBottomColor: colors.border, backgroundColor: colors.white }]}>
              <Text style={[styles.editHeaderTitle, { color: colors.slateDark }]}>{t('inventory.editStock')}</Text>
              <TouchableOpacity
                onPress={() => setSelectedDrinkId(null)}
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
                // @ts-ignore - className is web-only
                className="glass-button"
              >
                <Ionicons name="close" size={20} color={colors.slate} />
              </TouchableOpacity>
            </View>
            <EditDrinkScreen
              route={{ params: { drinkId: selectedDrinkId, hideHeader: true } }}
              navigation={{
                ...navigation,
                goBack: () => {
                  setSelectedDrinkId(null)
                  loadDrinks()
                }
              }}
            />
          </SlideIn>
        )}
        {showAddDrink && (
          <SlideIn style={[styles.desktopRight, { backgroundColor: colors.white, borderLeftColor: colors.border }]} duration={250}>
            <View style={[styles.editHeader, { borderBottomColor: colors.border, backgroundColor: colors.white }]}>
              <Text style={[styles.editHeaderTitle, { color: colors.slateDark }]}>{t('inventory.addDrink')}</Text>
              <TouchableOpacity
                onPress={() => setShowAddDrink(false)}
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
                // @ts-ignore - className is web-only
                className="glass-button"
              >
                <Ionicons name="close" size={20} color={colors.slate} />
              </TouchableOpacity>
            </View>
            <AddDrinkScreen
              route={{ params: { hideHeader: true } }}
              navigation={{
                ...navigation,
                goBack: () => {
                  setShowAddDrink(false)
                  loadDrinks()
                },
                switchToEdit: (drinkId: string) => {
                  setShowAddDrink(false)
                  setSelectedDrinkId(drinkId)
                }
              }}
            />
          </SlideIn>
        )}
      </FadeIn>
    )
  }

  return (
    <FadeIn style={[styles.container, { backgroundColor: colors.surface }]}>
      {drinkListContent}
      <FloatingModal
        visible={showAddDrink}
        onClose={() => setShowAddDrink(false)}
        title={t('inventory.addDrink')}
      >
        <AddDrinkScreen
          route={{ params: { hideHeader: true } }}
          navigation={{
            ...navigation,
            goBack: () => {
              setShowAddDrink(false)
              loadDrinks()
            },
            switchToEdit: (drinkId: string) => {
              setShowAddDrink(false)
              navigation.navigate('EditDrink', { drinkId })
            }
          }}
        />
      </FloatingModal>
    </FadeIn>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopLeft: {
    width: '50%',
    ...Platform.select({
      web: {
        transition: 'width 0.3s ease',
      } as any,
    }),
  },
  desktopLeftFull: {
    width: '100%',
  },
  desktopRight: {
    width: '50%',
    borderLeftWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  editHeaderTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  gridCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  summaryTile: { flex: 1, alignItems: 'center' },
  summaryTileBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  summaryValue: { fontSize: 18, fontFamily: FONT.extrabold, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  summaryLabel: { fontSize: 11, fontFamily: FONT.semibold, marginTop: 3 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: FONT.regular },
  categoryScroll: { maxHeight: 44, marginBottom: 12 },
  categoryScrollContent: { gap: 6, paddingBottom: 4, paddingHorizontal: GRID_PADDING },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryTabActive: {
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTabText: { fontSize: 12, fontFamily: FONT.semibold },
  categoryTabTextActive: {},
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: 250,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      },
    }),
  },
  gridBody: { padding: 12 },
  gridTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  gridCategory: { fontSize: 10, fontFamily: FONT.semibold, textTransform: 'uppercase' },
  gridName: { fontSize: 13, fontFamily: FONT.semibold, marginBottom: 6, lineHeight: 17 },
  gridStock: { fontSize: 16, fontFamily: FONT.bold, marginBottom: 6, fontVariant: ['tabular-nums'] },
  gridAlert: { fontSize: 10, fontFamily: FONT.semibold, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  emptyText: { fontSize: 15, fontFamily: FONT.regular },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabIcon: {
    marginTop: 1,
  },
})
