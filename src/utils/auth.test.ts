import { test } from 'node:test'
import assert from 'node:assert/strict'

// Auth validation utilities to test
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' }
  }
  if (password.length > 72) {
    return { valid: false, error: 'Le mot de passe ne peut pas dépasser 72 caractères' }
  }
  return { valid: true }
}

export function validateName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 100
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// ─── Email Validation Tests ───────────────────────────────────────────────
test('validateEmail: accepts valid email addresses', () => {
  assert.equal(validateEmail('test@example.com'), true)
  assert.equal(validateEmail('user.name@domain.co.uk'), true)
  assert.equal(validateEmail('user+tag@example.org'), true)
})

test('validateEmail: rejects invalid email addresses', () => {
  assert.equal(validateEmail(''), false)
  assert.equal(validateEmail('notanemail'), false)
  assert.equal(validateEmail('@example.com'), false)
  assert.equal(validateEmail('user@'), false)
  assert.equal(validateEmail('user @example.com'), false)
  assert.equal(validateEmail('user@.com'), false)
})

test('validateEmail: handles edge cases', () => {
  assert.equal(validateEmail('a@b.c'), true) // minimum valid
  assert.equal(validateEmail('test@domain'), false) // missing TLD
  assert.equal(validateEmail('test..user@example.com'), true) // consecutive dots in local part
})

// ─── Password Validation Tests ────────────────────────────────────────────
test('validatePassword: accepts valid passwords', () => {
  const result = validatePassword('password123')
  assert.equal(result.valid, true)
  assert.equal(result.error, undefined)
})

test('validatePassword: rejects passwords that are too short', () => {
  const result = validatePassword('12345')
  assert.equal(result.valid, false)
  assert.equal(result.error, 'Le mot de passe doit contenir au moins 6 caractères')
})

test('validatePassword: rejects passwords that are too long', () => {
  const longPassword = 'a'.repeat(73)
  const result = validatePassword(longPassword)
  assert.equal(result.valid, false)
  assert.equal(result.error, 'Le mot de passe ne peut pas dépasser 72 caractères')
})

test('validatePassword: minimum valid length', () => {
  const result = validatePassword('123456')
  assert.equal(result.valid, true)
})

test('validatePassword: maximum valid length', () => {
  const maxPassword = 'a'.repeat(72)
  const result = validatePassword(maxPassword)
  assert.equal(result.valid, true)
})

// ─── Name Validation Tests ────────────────────────────────────────────────
test('validateName: accepts valid names', () => {
  assert.equal(validateName('John Doe'), true)
  assert.equal(validateName('Marie'), true)
  assert.equal(validateName('Jean-Pierre'), true)
})

test('validateName: rejects invalid names', () => {
  assert.equal(validateName(''), false)
  assert.equal(validateName('   '), false)
  assert.equal(validateName('a'.repeat(101)), false)
})

test('validateName: trims whitespace', () => {
  assert.equal(validateName('  John  '), true)
})

// ─── Email Sanitization Tests ─────────────────────────────────────────────
test('sanitizeEmail: normalizes email addresses', () => {
  assert.equal(sanitizeEmail('Test@Example.COM'), 'test@example.com')
  assert.equal(sanitizeEmail('  user@domain.com  '), 'user@domain.com')
  assert.equal(sanitizeEmail('USER@DOMAIN.COM'), 'user@domain.com')
})

test('sanitizeEmail: preserves valid format', () => {
  assert.equal(sanitizeEmail('user+tag@example.com'), 'user+tag@example.com')
})

// ─── Integration Tests ────────────────────────────────────────────────────
test('Integration: complete signup validation workflow', () => {
  const name = '  John Doe  '
  const email = '  JOHN@EXAMPLE.COM  '
  const password = 'SecurePass123'
  const confirmPassword = 'SecurePass123'

  // Validate name
  assert.equal(validateName(name), true)

  // Sanitize and validate email
  const sanitizedEmail = sanitizeEmail(email)
  assert.equal(sanitizedEmail, 'john@example.com')
  assert.equal(validateEmail(sanitizedEmail), true)

  // Validate password
  const passwordResult = validatePassword(password)
  assert.equal(passwordResult.valid, true)

  // Check password match
  assert.equal(password === confirmPassword, true)
})

test('Integration: reject invalid signup data', () => {
  const name = ''
  const email = 'invalid-email'
  const password = '123'

  assert.equal(validateName(name), false)
  assert.equal(validateEmail(email), false)

  const passwordResult = validatePassword(password)
  assert.equal(passwordResult.valid, false)
})
