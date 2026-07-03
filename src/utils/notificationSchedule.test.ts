import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNotificationDue, pickRotating, NOTIF_COOLDOWN_MS } from './notificationSchedule'

test('isNotificationDue: never-sent is always due', () => {
  assert.equal(isNotificationDue(0, 1_000_000), true)
  assert.equal(isNotificationDue(NaN as unknown as number, 1_000_000), true)
})

test('isNotificationDue: within cooldown is not due', () => {
  const now = 1_000_000_000
  assert.equal(isNotificationDue(now - 1000, now, NOTIF_COOLDOWN_MS), false)
})

test('isNotificationDue: past cooldown is due', () => {
  const now = 1_000_000_000
  assert.equal(isNotificationDue(now - NOTIF_COOLDOWN_MS, now, NOTIF_COOLDOWN_MS), true)
  assert.equal(isNotificationDue(now - NOTIF_COOLDOWN_MS - 1, now, NOTIF_COOLDOWN_MS), true)
})

test('pickRotating: wraps around the list', () => {
  const items = ['a', 'b', 'c']
  assert.equal(pickRotating(items, 0), 'a')
  assert.equal(pickRotating(items, 1), 'b')
  assert.equal(pickRotating(items, 2), 'c')
  assert.equal(pickRotating(items, 3), 'a')
  assert.equal(pickRotating(items, 7), 'b')
})

test('pickRotating: empty list yields undefined', () => {
  assert.equal(pickRotating([], 3), undefined)
})
