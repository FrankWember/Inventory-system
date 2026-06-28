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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { Drink, Category } from '../types'
import { ScreenHeader } from '../components/ScreenHeader'
import { StockProgressBar } from '../components/StockProgressBar'
import {
  COLORS,
  getStockStatus,
  getStockColor,
  formatWithCassiersShort,
} from '../utils/helpers'

const GRID_GAP = 10
const GRID_PADDING = 12
const NUM_COLUMNS = 2
const CARD_WIDTH =
  (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

export default function InventoryScreen({ navigation }: any) {
  const [drinks, setDrinks] = useState<Drink[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Tout')

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

  const renderItem = ({ item: drink }: { item: Drink }) => {
    const status = getStockStatus(drink.stock, drink.min_stock)

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigation.navigate('EditDrink', { drinkId: drink.id })}
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

  return (
    <View style={styles.container}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: COLORS.slateDark },
  categoryScroll: { maxHeight: 44, marginBottom: 12 },
  categoryScrollContent: { gap: 6, paddingBottom: 4, paddingHorizontal: GRID_PADDING },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryTabText: { fontSize: 12, fontWeight: '600', color: COLORS.slate },
  categoryTabTextActive: { color: COLORS.white },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
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
