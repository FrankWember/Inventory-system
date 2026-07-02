const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim())
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isStrongEnough(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 6
}
