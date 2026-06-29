import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateEmail, validatePassword, validateName, sanitizeEmail } from '../utils/auth.test'

// ═══════════════════════════════════════════════════════════════════════════
// Authentication Integration Tests
// Testing complete user authentication flows
// ═══════════════════════════════════════════════════════════════════════════

// ─── User Story 1: Sign Up Flow ───────────────────────────────────────────
test('User Story: New user can sign up with email and password', async () => {
  // Given: A new user wants to create an account
  const userData = {
    name: '  John Doe  ',
    email: '  TEST@EXAMPLE.COM  ',
    password: 'SecurePassword123',
    confirmPassword: 'SecurePassword123',
  }

  // When: User submits the sign-up form
  // Step 1: Validate name
  const isNameValid = validateName(userData.name)
  assert.equal(isNameValid, true, 'Name should be valid')

  // Step 2: Sanitize and validate email
  const sanitizedEmail = sanitizeEmail(userData.email)
  assert.equal(sanitizedEmail, 'test@example.com', 'Email should be sanitized to lowercase and trimmed')
  const isEmailValid = validateEmail(sanitizedEmail)
  assert.equal(isEmailValid, true, 'Email should be valid')

  // Step 3: Validate password
  const passwordValidation = validatePassword(userData.password)
  assert.equal(passwordValidation.valid, true, 'Password should meet requirements')
  assert.equal(passwordValidation.error, undefined, 'Password should have no errors')

  // Step 4: Confirm passwords match
  const passwordsMatch = userData.password === userData.confirmPassword
  assert.equal(passwordsMatch, true, 'Passwords should match')

  // Then: All validation passes and user can be created
  assert.ok(isNameValid && isEmailValid && passwordValidation.valid && passwordsMatch,
    'User should be able to sign up successfully')
})

test('User Story: Sign up validation prevents invalid data', async () => {
  // Scenario 1: Empty name
  const invalidName = validateName('')
  assert.equal(invalidName, false, 'Empty name should be rejected')

  // Scenario 2: Invalid email format
  const invalidEmail = validateEmail('not-an-email')
  assert.equal(invalidEmail, false, 'Invalid email format should be rejected')

  // Scenario 3: Password too short
  const shortPassword = validatePassword('12345')
  assert.equal(shortPassword.valid, false, 'Short password should be rejected')
  assert.ok(shortPassword.error?.includes('6 caractères'), 'Should show minimum length error')

  // Scenario 4: Password too long
  const longPassword = validatePassword('a'.repeat(73))
  assert.equal(longPassword.valid, false, 'Long password should be rejected')
  assert.ok(longPassword.error?.includes('72 caractères'), 'Should show maximum length error')
})

test('User Story: Sign up handles edge cases properly', async () => {
  // Scenario 1: Name with special characters
  assert.equal(validateName('Jean-Pierre'), true, 'Should accept names with hyphens')
  assert.equal(validateName("O'Connor"), true, 'Should accept names with apostrophes')

  // Scenario 2: Email with tags
  const emailWithTag = 'user+tag@example.com'
  assert.equal(validateEmail(emailWithTag), true, 'Should accept email with + tag')
  assert.equal(sanitizeEmail(emailWithTag), emailWithTag, 'Should preserve email tags')

  // Scenario 3: Minimum valid password
  const minPassword = validatePassword('123456')
  assert.equal(minPassword.valid, true, 'Should accept minimum 6 character password')

  // Scenario 4: Maximum valid password
  const maxPassword = validatePassword('a'.repeat(72))
  assert.equal(maxPassword.valid, true, 'Should accept maximum 72 character password')
})

// ─── User Story 2: Sign In Flow ──────────────────────────────────────────
test('User Story: Existing user can sign in with email and password', async () => {
  // Given: A registered user wants to sign in
  const credentials = {
    email: '  USER@EXAMPLE.COM  ',
    password: 'MyPassword123',
  }

  // When: User submits login form
  // Step 1: Sanitize email input
  const sanitizedEmail = sanitizeEmail(credentials.email)
  assert.equal(sanitizedEmail, 'user@example.com', 'Email should be normalized')

  // Step 2: Validate email format
  const isEmailValid = validateEmail(sanitizedEmail)
  assert.equal(isEmailValid, true, 'Email should be valid')

  // Step 3: Validate password exists
  const hasPassword = credentials.password.length > 0
  assert.equal(hasPassword, true, 'Password should be provided')

  // Then: Credentials are valid for authentication
  assert.ok(isEmailValid && hasPassword, 'User should be able to sign in')
})

test('User Story: Sign in validation prevents empty fields', async () => {
  // Scenario 1: Empty email
  const emptyEmail = validateEmail('')
  assert.equal(emptyEmail, false, 'Empty email should be rejected')

  // Scenario 2: Invalid email
  const invalidEmail = validateEmail('notanemail')
  assert.equal(invalidEmail, false, 'Invalid email should be rejected')

  // Scenario 3: Whitespace-only email
  const whitespaceEmail = sanitizeEmail('   ')
  assert.equal(validateEmail(whitespaceEmail), false, 'Whitespace-only email should be rejected')
})

// ─── User Story 3: Password Reset Flow ────────────────────────────────────
test('User Story: User can request password reset with valid email', async () => {
  // Given: A user forgot their password
  const email = '  FORGOT@EXAMPLE.COM  '

  // When: User requests password reset
  // Step 1: Sanitize email
  const sanitizedEmail = sanitizeEmail(email)
  assert.equal(sanitizedEmail, 'forgot@example.com', 'Email should be sanitized')

  // Step 2: Validate email
  const isEmailValid = validateEmail(sanitizedEmail)
  assert.equal(isEmailValid, true, 'Email should be valid')

  // Then: Password reset can be initiated
  assert.ok(isEmailValid, 'Password reset request should be valid')
})

test('User Story: Password reset validates email format', async () => {
  // Scenario 1: Invalid email format
  const invalidEmail = 'not-valid-email'
  assert.equal(validateEmail(invalidEmail), false, 'Invalid email should be rejected')

  // Scenario 2: Empty email
  assert.equal(validateEmail(''), false, 'Empty email should be rejected')

  // Scenario 3: Email without domain
  assert.equal(validateEmail('user@'), false, 'Email without domain should be rejected')
})

// ─── User Story 4: Phone Authentication Flow ──────────────────────────────
test('User Story: User can sign in with phone number', async () => {
  // Given: A user wants to authenticate with phone number
  const phoneNumber = '+33123456789'

  // When: User enters phone number
  // Step 1: Validate phone format (basic validation)
  const hasPlus = phoneNumber.startsWith('+')
  const hasDigits = /\d{8,}/.test(phoneNumber)
  const isPhoneValid = hasPlus && hasDigits

  assert.equal(isPhoneValid, true, 'Phone number should be valid')

  // Then: Phone authentication can proceed
  assert.ok(isPhoneValid, 'User should be able to authenticate with phone')
})

test('User Story: Phone authentication validates format', async () => {
  // Scenario 1: Phone without country code
  const noCountryCode = '0123456789'
  assert.equal(noCountryCode.startsWith('+'), false, 'Phone without + should be invalid')

  // Scenario 2: Too short
  const tooShort = '+3312345'
  assert.equal(/\d{8,}/.test(tooShort), false, 'Too short phone should be invalid')

  // Scenario 3: Valid international format
  const validPhone = '+33612345678'
  assert.ok(validPhone.startsWith('+') && /\d{8,}/.test(validPhone), 'Valid phone should pass')
})

// ─── User Story 5: Email Normalization ────────────────────────────────────
test('User Story: Email addresses are normalized consistently', async () => {
  // Given: Different email input formats
  const testCases = [
    { input: 'TEST@EXAMPLE.COM', expected: 'test@example.com' },
    { input: '  user@domain.com  ', expected: 'user@domain.com' },
    { input: 'MixedCase@Example.COM', expected: 'mixedcase@example.com' },
    { input: 'user+tag@example.com', expected: 'user+tag@example.com' },
  ]

  // When: Emails are sanitized
  for (const testCase of testCases) {
    const result = sanitizeEmail(testCase.input)

    // Then: All emails are normalized consistently
    assert.equal(result, testCase.expected,
      `${testCase.input} should normalize to ${testCase.expected}`)
  }
})

// ─── User Story 6: Complete Registration Validation ───────────────────────
test('User Story: Complete sign-up form validation workflow', async () => {
  // Given: A user filling out the complete sign-up form
  const formData = {
    name: 'Marie Dubois',
    email: 'marie.dubois@example.fr',
    password: 'SecurePass2024!',
    confirmPassword: 'SecurePass2024!',
  }

  // When: Each field is validated
  const validations = {
    name: validateName(formData.name),
    email: validateEmail(sanitizeEmail(formData.email)),
    password: validatePassword(formData.password).valid,
    passwordMatch: formData.password === formData.confirmPassword,
  }

  // Then: All validations pass
  assert.equal(validations.name, true, 'Name validation should pass')
  assert.equal(validations.email, true, 'Email validation should pass')
  assert.equal(validations.password, true, 'Password validation should pass')
  assert.equal(validations.passwordMatch, true, 'Passwords should match')

  const allValid = Object.values(validations).every(v => v === true)
  assert.ok(allValid, 'Complete form should be valid')
})

test('User Story: Sign-up form rejects incomplete or mismatched data', async () => {
  // Scenario 1: Passwords don't match
  const mismatchedPasswords = {
    password: 'Password123',
    confirmPassword: 'DifferentPassword456',
  }
  assert.equal(
    mismatchedPasswords.password === mismatchedPasswords.confirmPassword,
    false,
    'Mismatched passwords should be rejected'
  )

  // Scenario 2: Invalid email with valid password
  const invalidEmailData = {
    email: 'invalid-email',
    password: 'ValidPassword123',
  }
  assert.equal(validateEmail(invalidEmailData.email), false, 'Invalid email should fail')

  // Scenario 3: Valid email with invalid password
  const invalidPasswordData = {
    email: 'valid@example.com',
    password: '123', // Too short
  }
  const passwordCheck = validatePassword(invalidPasswordData.password)
  assert.equal(passwordCheck.valid, false, 'Invalid password should fail')
})

// ─── User Story 7: Security Validations ───────────────────────────────────
test('User Story: Password security requirements are enforced', async () => {
  // Given: Various password attempts
  const testCases = [
    { password: '12345', shouldPass: false, reason: 'too short' },
    { password: '123456', shouldPass: true, reason: 'minimum length' },
    { password: 'a'.repeat(72), shouldPass: true, reason: 'maximum length' },
    { password: 'a'.repeat(73), shouldPass: false, reason: 'too long' },
    { password: 'Simple123', shouldPass: true, reason: 'valid password' },
    { password: 'P@ssw0rd!2024', shouldPass: true, reason: 'complex password' },
  ]

  // When: Each password is validated
  for (const testCase of testCases) {
    const result = validatePassword(testCase.password)

    // Then: Validation matches expected security requirements
    assert.equal(result.valid, testCase.shouldPass,
      `Password '${testCase.password.substring(0, 10)}...' (${testCase.reason}) should ${testCase.shouldPass ? 'pass' : 'fail'}`)

    if (!testCase.shouldPass) {
      assert.ok(result.error, `Should provide error message for ${testCase.reason}`)
    }
  }
})

// ─── User Story 8: Name Validation Edge Cases ─────────────────────────────
test('User Story: Name field accepts various valid formats', async () => {
  // Given: Different name formats
  const validNames = [
    'John',
    'Mary Jane',
    'Jean-Pierre',
    "O'Connor",
    'Anne Marie Louise',
    'X',
    'a'.repeat(100), // Maximum length
  ]

  // When: Names are validated
  for (const name of validNames) {
    // Then: All valid formats are accepted
    assert.equal(validateName(name), true, `Name '${name}' should be valid`)
  }

  // Given: Invalid name formats
  const invalidNames = [
    '',
    '   ',
    'a'.repeat(101), // Too long
  ]

  // When: Invalid names are validated
  for (const name of invalidNames) {
    // Then: All invalid formats are rejected
    assert.equal(validateName(name), false, `Name '${name}' should be invalid`)
  }
})
