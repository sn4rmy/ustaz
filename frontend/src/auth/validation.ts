// Same rules as backend/app/schemas/auth.py, so most mistakes are caught before the request.

export const PASSWORD_MIN_LENGTH = 8
// bcrypt limit; in Cyrillic or Kazakh letters that's 36 characters.
export const PASSWORD_MAX_BYTES = 72
export const NAME_MAX_LENGTH = 100

export function isEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

export function passwordBytes(value: string): number {
  return new TextEncoder().encode(value).length
}
