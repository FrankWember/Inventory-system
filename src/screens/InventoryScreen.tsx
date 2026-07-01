import React, { useState, useEffect } from 'react'
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
import {
  COLORS,
  FONT,
  fmtShort,
  getStockStatus,
  getStockColor,
  formatWithCassiersShort,
} from '../utils/helpers'

const GRID_GAP = 12
const GRID_PADDING = 16
const BREAKPOINT = 768

export default function InventoryScreen({ navigation }: any) {
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

  const loadDrinks = async () => {
    try {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      setDrinks(data || [])
    } catch (error) {
      console.error('Error loading drinks:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDrinks() }, [])

  useEffect(() => {
    const sub = navigation.addListener('focus', loadDrinks)
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
      <View style={styles.container}>
        <ScreenHeader title="Stock" subtitle="Chargement…" />
        <ScreenSkeleton variant="grid" />
      </View>
    )
  }

  const statusRank: Record<string, number> = { rupture: 0, low: 1, medium: 2, ok: 3 }
  const filtered = drinks
    .filter(d => {
      if (!d.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'Tout' && d.category !== categoryFilter) return false
      return true
    })
    // Most urgent first (rupture → low → medium → ok), then alphabetical.
    .sort((a, b) => {
      const ra = statusRank[getStockStatus(a.stock, a.min_stock)]
      const rb = statusRank[getStockStatus(b.stock, b.min_stock)]
      return ra !== rb ? ra - rb : a.name.localeCompare(b.name)
    })

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
        style={[styles.gridCard, isSelected && styles.gridCardSelected]}
        onPress={() => handleDrinkPress(drink.id)}
        activeOpacity={0.7}
      >
        <View style={styles.gridBody}>
          <View style={styles.gridTop}>
            <View style={[styles.statusDot, { backgroundColor: getStockColor(status) }]} />
            <Text style={styles.gridCategory}>{drink.category}</Text>
          </View>
          <Text style={styles.gridName} numberOfLines={2}>{drink.name}</Text>
          <Text style={styles.gridStock}>
            {formatWithCassiersShort(drink.stock, drink.category)}
          </Text>
          <StockProgressBar stock={drink.stock} minStock={drink.min_stock} />
          {(status === 'rupture' || status === 'low') && (
            <Text style={styles.gridAlert}>
              {status === 'rupture' ? 'Rupture' : 'Stock bas'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const drinkListContent = (
    <>
      <ScreenHeader
        title="Stock"
        subtitle={`${drinks.length} références`}
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{fmtShort(stockValue)}</Text>
          <Text style={styles.summaryLabel}>Valeur stock</Text>
        </View>
        <View style={[styles.summaryTile, styles.summaryTileBordered]}>
          <Text style={[styles.summaryValue, ruptureCount > 0 && { color: COLORS.rose }]}>{ruptureCount}</Text>
          <Text style={styles.summaryLabel}>Ruptures</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={[styles.summaryValue, lowCount > 0 && { color: COLORS.primary }]}>{lowCount}</Text>
          <Text style={styles.summaryLabel}>Stock bas</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.slate} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.slate}
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
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              // @ts-ignore - className is web-only
              className={isActive ? "glass-primary" : "glass-button"}
            >
              <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                {cat} ({count})
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDrinks() }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucune boisson trouvée</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setSelectedDrinkId(null)
          setShowAddDrink(true)
        }}
        // @ts-ignore - className is web-only
        className="glass-primary"
      >
        <Ionicons name="add" size={28} color={COLORS.white} style={styles.fabIcon} />
      </TouchableOpacity>
    </>
  )

  if (isDesktop) {
    return (
      <FadeIn style={styles.desktopContainer}>
        <View style={[styles.desktopLeft, !selectedDrinkId && !showAddDrink && styles.desktopLeftFull]}>
          {drinkListContent}
        </View>
        {selectedDrinkId && (
          <SlideIn style={styles.desktopRight} duration={250}>
            <View style={styles.editHeader}>
              <Text style={styles.editHeaderTitle}>Modifier le stock</Text>
              <TouchableOpacity
                onPress={() => setSelectedDrinkId(null)}
                style={styles.closeButton}
                // @ts-ignore - className is web-only
                className="glass-button"
              >
                <Ionicons name="close" size={20} color={COLORS.slate} />
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
          <SlideIn style={styles.desktopRight} duration={250}>
            <View style={styles.editHeader}>
              <Text style={styles.editHeaderTitle}>Ajouter une boisson</Text>
              <TouchableOpacity
                onPress={() => setShowAddDrink(false)}
                style={styles.closeButton}
                // @ts-ignore - className is web-only
                className="glass-button"
              >
                <Ionicons name="close" size={20} color={COLORS.slate} />
              </TouchableOpacity>
            </View>
            <AddDrinkScreen
              route={{ params: { hideHeader: true } }}
              navigation={{
                ...navigation,
                goBack: () => {
                  setShowAddDrink(false)
                  loadDrinks()
                }
              }}
            />
          </SlideIn>
        )}
      </FadeIn>
    )
  }

  return (
    <FadeIn style={styles.container}>
      {drinkListContent}
      <FloatingModal
        visible={showAddDrink}
        onClose={() => setShowAddDrink(false)}
        title="Ajouter une boisson"
      >
        <AddDrinkScreen
          route={{ params: { hideHeader: true } }}
          navigation={{
            ...navigation,
            goBack: () => {
              setShowAddDrink(false)
              loadDrinks()
            }
          }}
        />
      </FloatingModal>
    </FadeIn>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
  },
  desktopLeft: {
    width: '50%',
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  editHeaderTitle: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: COLORS.slateDark,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
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
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
  },
  summaryTile: { flex: 1, alignItems: 'center' },
  summaryTileBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: { fontSize: 18, fontFamily: FONT.extrabold, color: COLORS.slateDark, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  summaryLabel: { fontSize: 11, fontFamily: FONT.semibold, color: COLORS.slate, marginTop: 3 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontFamily: FONT.regular, color: COLORS.slateDark },
  categoryScroll: { maxHeight: 44, marginBottom: 12 },
  categoryScrollContent: { gap: 6, paddingBottom: 4, paddingHorizontal: GRID_PADDING },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryTabText: { fontSize: 12, fontFamily: FONT.semibold, color: COLORS.slate },
  categoryTabTextActive: { color: COLORS.white },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: 250,
    backgroundColor: COLORS.white,
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
  gridCategory: { fontSize: 10, fontFamily: FONT.semibold, color: COLORS.slate, textTransform: 'uppercase' },
  gridName: { fontSize: 13, fontFamily: FONT.semibold, color: COLORS.slateDark, marginBottom: 6, lineHeight: 17 },
  gridStock: { fontSize: 16, fontFamily: FONT.bold, color: COLORS.primary, marginBottom: 6, fontVariant: ['tabular-nums'] },
  gridAlert: { fontSize: 10, fontFamily: FONT.semibold, color: COLORS.rose, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  emptyText: { fontSize: 15, fontFamily: FONT.regular, color: COLORS.slate },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabIcon: {
    marginTop: 1,
  },
})
