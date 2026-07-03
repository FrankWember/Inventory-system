import { test } from 'node:test'
import assert from 'node:assert/strict'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getTheme,
  setTheme,
  getLanguage,
  setLanguage,
  getNotificationsEnabled,
  setNotificationsEnabled,
  getBarInfo,
  setBarInfo,
  clearCache,
  exportData,
  type Theme,
  type Language,
  type BarInfo,
} from './storage'

// Mock AsyncStorage for testing
const mockStorage: Record<string, string> = {}

const mockAsyncStorage = {
  getItem: async (key: string) => mockStorage[key] || null,
  setItem: async (key: string, value: string) => {
    mockStorage[key] = value
  },
  removeItem: async (key: string) => {
    delete mockStorage[key]
  },
  getAllKeys: async () => Object.keys(mockStorage),
  multiGet: async (keys: string[]) => {
    return keys.map(key => [key, mockStorage[key] || null])
  },
  multiRemove: async (keys: string[]) => {
    keys.forEach(key => delete mockStorage[key])
  },
  clear: async () => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  },
}

// Replace AsyncStorage with mock
Object.assign(AsyncStorage, mockAsyncStorage)

// ─── Theme Tests ──────────────────────────────────────────────────────────
test('getTheme: returns default light theme when not set', async () => {
  await mockAsyncStorage.clear()
  const theme = await getTheme()
  assert.equal(theme, 'light')
})

test('setTheme: saves theme to storage', async () => {
  await mockAsyncStorage.clear()
  await setTheme('dark')
  const theme = await getTheme()
  assert.equal(theme, 'dark')
})

test('setTheme: can switch between themes', async () => {
  await mockAsyncStorage.clear()
  await setTheme('light')
  assert.equal(await getTheme(), 'light')
  await setTheme('dark')
  assert.equal(await getTheme(), 'dark')
})

// ─── Language Tests ───────────────────────────────────────────────────────
test('getLanguage: returns default French when not set', async () => {
  await mockAsyncStorage.clear()
  const language = await getLanguage()
  assert.equal(language, 'fr')
})

test('setLanguage: saves language to storage', async () => {
  await mockAsyncStorage.clear()
  await setLanguage('en')
  const language = await getLanguage()
  assert.equal(language, 'en')
})

test('setLanguage: can switch between languages', async () => {
  await mockAsyncStorage.clear()
  await setLanguage('fr')
  assert.equal(await getLanguage(), 'fr')
  await setLanguage('en')
  assert.equal(await getLanguage(), 'en')
})

// ─── Notifications Tests ──────────────────────────────────────────────────
test('getNotificationsEnabled: returns true by default (opt-out engagement)', async () => {
  await mockAsyncStorage.clear()
  const enabled = await getNotificationsEnabled()
  assert.equal(enabled, true)
})

test('getNotificationsEnabled: explicit false stays false', async () => {
  await mockAsyncStorage.clear()
  await setNotificationsEnabled(false)
  assert.equal(await getNotificationsEnabled(), false)
})

test('setNotificationsEnabled: saves notification preference', async () => {
  await mockAsyncStorage.clear()
  await setNotificationsEnabled(true)
  const enabled = await getNotificationsEnabled()
  assert.equal(enabled, true)
})

test('setNotificationsEnabled: can toggle notifications', async () => {
  await mockAsyncStorage.clear()
  await setNotificationsEnabled(true)
  assert.equal(await getNotificationsEnabled(), true)
  await setNotificationsEnabled(false)
  assert.equal(await getNotificationsEnabled(), false)
})

// ─── Bar Info Tests ───────────────────────────────────────────────────────
test('getBarInfo: returns null when not set', async () => {
  await mockAsyncStorage.clear()
  const info = await getBarInfo()
  assert.equal(info, null)
})

test('setBarInfo: saves bar information', async () => {
  await mockAsyncStorage.clear()
  const barInfo: BarInfo = {
    name: 'Le Bar Test',
    address: '123 Rue Test',
    phone: '+33123456789',
  }
  await setBarInfo(barInfo)
  const retrieved = await getBarInfo()
  assert.deepEqual(retrieved, barInfo)
})

test('setBarInfo: can update bar information', async () => {
  await mockAsyncStorage.clear()
  await setBarInfo({ name: 'First Bar' })
  await setBarInfo({ name: 'Updated Bar', address: 'New Address' })
  const info = await getBarInfo()
  assert.equal(info?.name, 'Updated Bar')
  assert.equal(info?.address, 'New Address')
})

// ─── Cache Clearing Tests ─────────────────────────────────────────────────
test('clearCache: removes non-essential data', async () => {
  await mockAsyncStorage.clear()
  await mockAsyncStorage.setItem('supabase.auth.token', 'token123')
  await mockAsyncStorage.setItem('@bartrack:theme', 'dark')
  await mockAsyncStorage.setItem('@bartrack:language', 'en')
  await mockAsyncStorage.setItem('cache:data', 'cached')

  await clearCache()

  // Essential data should remain
  assert.equal(await mockAsyncStorage.getItem('supabase.auth.token'), 'token123')
  assert.equal(await mockAsyncStorage.getItem('@bartrack:theme'), 'dark')
  assert.equal(await mockAsyncStorage.getItem('@bartrack:language'), 'en')

  // Cache data should be removed
  assert.equal(await mockAsyncStorage.getItem('cache:data'), null)
})

// ─── Data Export Tests ────────────────────────────────────────────────────
test('exportData: exports all storage data as JSON', async () => {
  await mockAsyncStorage.clear()
  await mockAsyncStorage.setItem('key1', 'value1')
  await mockAsyncStorage.setItem('key2', 'value2')

  const exported = await exportData()
  const parsed = JSON.parse(exported)

  assert.equal(parsed.key1, 'value1')
  assert.equal(parsed.key2, 'value2')
})

test('exportData: returns empty object when no data', async () => {
  await mockAsyncStorage.clear()
  const exported = await exportData()
  const parsed = JSON.parse(exported)
  assert.deepEqual(parsed, {})
})

// ─── Integration Tests ────────────────────────────────────────────────────
test('Integration: full settings workflow', async () => {
  await mockAsyncStorage.clear()

  // Set initial settings
  await setTheme('dark')
  await setLanguage('en')
  await setNotificationsEnabled(true)
  await setBarInfo({ name: 'Integration Test Bar' })

  // Verify all settings
  assert.equal(await getTheme(), 'dark')
  assert.equal(await getLanguage(), 'en')
  assert.equal(await getNotificationsEnabled(), true)
  const info = await getBarInfo()
  assert.equal(info?.name, 'Integration Test Bar')

  // Export and verify
  const exported = await exportData()
  assert.ok(exported.includes('dark'))
  assert.ok(exported.includes('en'))
  assert.ok(exported.includes('Integration Test Bar'))
})
