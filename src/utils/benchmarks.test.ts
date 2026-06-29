import { test } from 'node:test'
import assert from 'node:assert/strict'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  setTheme,
  setLanguage,
  setNotificationsEnabled,
  setBarInfo,
  getTheme,
  getLanguage,
  exportData,
  clearCache,
} from '../lib/storage'

// Mock AsyncStorage for benchmarking
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

Object.assign(AsyncStorage, mockAsyncStorage)

// Benchmark helper
async function benchmark(name: string, iterations: number, fn: () => Promise<void>): Promise<number> {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    await fn()
  }

  const end = performance.now()
  const totalTime = end - start
  const avgTime = totalTime / iterations

  console.log(`\n[BENCHMARK] ${name}`)
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`)
  console.log(`  Iterations: ${iterations}`)
  console.log(`  Avg time: ${avgTime.toFixed(4)}ms`)

  return avgTime
}

// ─── Storage Write Performance ────────────────────────────────────────────
test('Benchmark: setTheme performance', async () => {
  await mockAsyncStorage.clear()
  const avgTime = await benchmark('setTheme', 1000, async () => {
    await setTheme('light')
  })

  // Should complete in under 1ms on average
  assert.ok(avgTime < 1, `setTheme took ${avgTime}ms, expected < 1ms`)
})

test('Benchmark: setLanguage performance', async () => {
  await mockAsyncStorage.clear()
  const avgTime = await benchmark('setLanguage', 1000, async () => {
    await setLanguage('fr')
  })

  assert.ok(avgTime < 1, `setLanguage took ${avgTime}ms, expected < 1ms`)
})

test('Benchmark: setNotificationsEnabled performance', async () => {
  await mockAsyncStorage.clear()
  const avgTime = await benchmark('setNotificationsEnabled', 1000, async () => {
    await setNotificationsEnabled(true)
  })

  assert.ok(avgTime < 1, `setNotificationsEnabled took ${avgTime}ms, expected < 1ms`)
})

test('Benchmark: setBarInfo performance', async () => {
  await mockAsyncStorage.clear()
  const avgTime = await benchmark('setBarInfo', 1000, async () => {
    await setBarInfo({ name: 'Test Bar', address: '123 Test St', phone: '123456' })
  })

  assert.ok(avgTime < 2, `setBarInfo took ${avgTime}ms, expected < 2ms`)
})

// ─── Storage Read Performance ─────────────────────────────────────────────
test('Benchmark: getTheme performance', async () => {
  await mockAsyncStorage.clear()
  await setTheme('dark')

  const avgTime = await benchmark('getTheme', 1000, async () => {
    await getTheme()
  })

  assert.ok(avgTime < 1, `getTheme took ${avgTime}ms, expected < 1ms`)
})

test('Benchmark: getLanguage performance', async () => {
  await mockAsyncStorage.clear()
  await setLanguage('en')

  const avgTime = await benchmark('getLanguage', 1000, async () => {
    await getLanguage()
  })

  assert.ok(avgTime < 1, `getLanguage took ${avgTime}ms, expected < 1ms`)
})

// ─── Bulk Operations Performance ──────────────────────────────────────────
test('Benchmark: exportData with 100 keys', async () => {
  await mockAsyncStorage.clear()

  // Populate storage with 100 keys
  for (let i = 0; i < 100; i++) {
    await mockAsyncStorage.setItem(`key${i}`, `value${i}`)
  }

  const avgTime = await benchmark('exportData (100 keys)', 100, async () => {
    await exportData()
  })

  // Should complete in under 10ms on average
  assert.ok(avgTime < 10, `exportData took ${avgTime}ms, expected < 10ms`)
})

test('Benchmark: clearCache with 50 keys', async () => {
  await mockAsyncStorage.clear()

  const avgTime = await benchmark('clearCache (50 keys)', 100, async () => {
    // Setup 50 keys before each clear
    for (let i = 0; i < 50; i++) {
      await mockAsyncStorage.setItem(`cache:key${i}`, `value${i}`)
    }
    await clearCache()
  })

  // Should complete in under 20ms on average (includes setup)
  assert.ok(avgTime < 20, `clearCache took ${avgTime}ms, expected < 20ms`)
})

// ─── Concurrent Operations Performance ────────────────────────────────────
test('Benchmark: concurrent writes', async () => {
  await mockAsyncStorage.clear()

  const start = performance.now()

  await Promise.all([
    setTheme('dark'),
    setLanguage('en'),
    setNotificationsEnabled(true),
    setBarInfo({ name: 'Concurrent Bar' }),
  ])

  const end = performance.now()
  const totalTime = end - start

  console.log(`\n[BENCHMARK] Concurrent writes`)
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`)

  // Concurrent operations should be fast
  assert.ok(totalTime < 10, `Concurrent writes took ${totalTime}ms, expected < 10ms`)
})

test('Benchmark: concurrent reads', async () => {
  await mockAsyncStorage.clear()
  await setTheme('dark')
  await setLanguage('en')

  const start = performance.now()

  await Promise.all([
    getTheme(),
    getLanguage(),
  ])

  const end = performance.now()
  const totalTime = end - start

  console.log(`\n[BENCHMARK] Concurrent reads`)
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`)

  assert.ok(totalTime < 5, `Concurrent reads took ${totalTime}ms, expected < 5ms`)
})

// ─── Memory Usage Tests ───────────────────────────────────────────────────
test('Benchmark: memory efficiency of large exports', async () => {
  await mockAsyncStorage.clear()

  // Create large dataset
  for (let i = 0; i < 1000; i++) {
    await mockAsyncStorage.setItem(`key${i}`, JSON.stringify({ id: i, data: 'x'.repeat(100) }))
  }

  const start = performance.now()
  const exported = await exportData()
  const end = performance.now()

  const exportTime = end - start
  const exportSizeKB = new Blob([exported]).size / 1024

  console.log(`\n[BENCHMARK] Large export (1000 keys)`)
  console.log(`  Export time: ${exportTime.toFixed(2)}ms`)
  console.log(`  Export size: ${exportSizeKB.toFixed(2)}KB`)

  // Export should complete reasonably fast even with 1000 keys
  assert.ok(exportTime < 100, `Large export took ${exportTime}ms, expected < 100ms`)
})

// ─── Performance Comparison ───────────────────────────────────────────────
test('Benchmark: read vs write performance', async () => {
  await mockAsyncStorage.clear()

  const writeTime = await benchmark('Write operations', 500, async () => {
    await setTheme('light')
  })

  await setTheme('dark')

  const readTime = await benchmark('Read operations', 500, async () => {
    await getTheme()
  })

  console.log(`\n[BENCHMARK] Read vs Write comparison`)
  console.log(`  Write avg: ${writeTime.toFixed(4)}ms`)
  console.log(`  Read avg: ${readTime.toFixed(4)}ms`)
  console.log(`  Ratio: ${(writeTime / readTime).toFixed(2)}x`)

  // Reads should generally be faster than or equal to writes
  assert.ok(readTime <= writeTime * 2, 'Reads should not be significantly slower than writes')
})
