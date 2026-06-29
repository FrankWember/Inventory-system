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
import EditDrinkScreen from './EditDrinkScreen'
import {
  COLORS,
  getStockStatus,
  getStockColor,
  formatWithCassiersShort,
} from '../utils/helpers'

const GRID_GAP = 10
const GRID_PADDING = 12
const NUM_COLUMNS = 2
const BREAKPOINT = 768

export default function InventoryScreen({ navigation }: any) {
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tout')
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width)

  const isDesktop = Platform.OS === 'web' && windowWidth >= BREAKPOINT

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const filtered = drinks.filter(d => {
    if (!d.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'Tout' && d.category !== categoryFilter) return false
    return true
  })

  const alertCount = drinks.filter(d => d.stock <= d.min_stock).length

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
        subtitle={`${drinks.length} boissons${alertCount > 0 ? ` · ${alertCount} alertes` : ''}`}
      />

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
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[styles.categoryTab, categoryFilter === cat && styles.categoryTabActive]}
            >
              <Text style={[styles.categoryTabText, categoryFilter === cat && styles.categoryTabTextActive]}>
                {cat} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        numColumns={NUM_COLUMNS}
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
        onPress={() => navigation.navigate('AddDrink')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} style={styles.fabIcon} />
      </TouchableOpacity>
    </>
  )

  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        <View style={styles.desktopLeft}>
          {drinkListContent}
        </View>
        {selectedDrinkId && (
          <View style={styles.desktopRight}>
            <View style={styles.editHeader}>
              <TouchableOpacity onPress={() => setSelectedDrinkId(null)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.slate} />
              </TouchableOpacity>
            </View>
            <EditDrinkScreen
              route={{ params: { drinkId: selectedDrinkId } }}
              navigation={{
                ...navigation,
                goBack: () => {
                  setSelectedDrinkId(null)
                  loadDrinks()
                }
              }}
            />
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {drinkListContent}
    </View>
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
    width: '45%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  desktopRight: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.slateLight,
  },
  gridCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
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
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: COLORS.slateDark },
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
  categoryTabText: { fontSize: 12, fontWeight: '600', color: COLORS.slate },
  categoryTabTextActive: { color: COLORS.white },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gridBody: { padding: 12 },
  gridTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  gridCategory: { fontSize: 10, color: COLORS.slate, fontWeight: '600', textTransform: 'uppercase' },
  gridName: { fontSize: 13, fontWeight: '600', color: COLORS.slateDark, marginBottom: 6, lineHeight: 17 },
  gridStock: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  gridAlert: { fontSize: 10, color: COLORS.rose, fontWeight: '600', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  emptyText: { fontSize: 15, color: COLORS.slate },
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
