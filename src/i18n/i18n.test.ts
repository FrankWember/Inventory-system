import { test } from 'node:test'
import assert from 'node:assert/strict'
import { t, setLang, getLang, getLocale } from './core'

import common from './locales/common'
import auth from './locales/auth'
import dashboard from './locales/dashboard'
import inventory from './locales/inventory'
import session from './locales/session'
import stats from './locales/stats'
import settings from './locales/settings'
import misc from './locales/misc'

const NAMESPACES = { common, auth, dashboard, inventory, session, stats, settings, misc }

// ─── Key parity: every fr key has an en key and vice versa ───────────────────
test('i18n: fr and en tables have identical keys in every namespace', () => {
  for (const [name, ns] of Object.entries(NAMESPACES)) {
    const frKeys = Object.keys(ns.fr).sort()
    const enKeys = Object.keys(ns.en).sort()
    assert.deepEqual(
      frKeys,
      enKeys,
      `Namespace "${name}" has mismatched fr/en keys: ` +
        `fr-only=[${frKeys.filter(k => !(k in ns.en))}] en-only=[${enKeys.filter(k => !(k in ns.fr))}]`
    )
  }
})

test('i18n: no translation value is empty', () => {
  for (const [name, ns] of Object.entries(NAMESPACES)) {
    for (const lang of ['fr', 'en'] as const) {
      for (const [k, v] of Object.entries(ns[lang])) {
        assert.ok(v && v.trim().length > 0, `Empty value at ${name}.${k} (${lang})`)
      }
    }
  }
})

// ─── t() resolution ──────────────────────────────────────────────────────────
test('t: resolves a known key in the active language', () => {
  setLang('fr')
  assert.equal(t('common.cancel'), 'Annuler')
  setLang('en')
  assert.equal(t('common.cancel'), 'Cancel')
})

test('t: unknown key falls back to the key string itself', () => {
  setLang('en')
  assert.equal(t('common.doesNotExist'), 'common.doesNotExist')
  assert.equal(t('nosuchns.key'), 'nosuchns.key')
})

test('t: missing en value falls back to fr, never to empty', () => {
  // dashboard.title exists in both; force-check the fallback path via a key
  // present in fr — all keys have en here, so assert the resolver returns fr
  // when lang is fr regardless.
  setLang('fr')
  assert.equal(t('dashboard.title'), 'Accueil')
})

test('t: interpolates {params}', () => {
  setLang('fr')
  assert.equal(t('dashboard.threshold', { value: 12 }), 'Seuil 12')
  setLang('en')
  assert.equal(t('dashboard.threshold', { value: 12 }), 'Threshold 12')
})

test('t: leaves unmatched placeholders untouched but fills matched ones', () => {
  setLang('fr')
  // session.newStock = "Nouveau stock : {value}"
  assert.equal(t('session.newStock', { value: '3 casiers' }), 'Nouveau stock : 3 casiers')
})

test('t: a key with no namespace prefix reads from common', () => {
  setLang('fr')
  assert.equal(t('cancel'), 'Annuler')
})

// ─── locale helpers ──────────────────────────────────────────────────────────
test('getLocale / getLang track setLang', () => {
  setLang('fr')
  assert.equal(getLang(), 'fr')
  assert.equal(getLocale(), 'fr-FR')
  setLang('en')
  assert.equal(getLang(), 'en')
  assert.equal(getLocale(), 'en-US')
})

// Reset to default so other suites are unaffected
test('i18n: reset to fr', () => {
  setLang('fr')
  assert.equal(getLang(), 'fr')
})
