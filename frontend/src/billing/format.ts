import type { Price } from '../api/types'

export function formatPrice(price: Price, language: string): string {
  const amount = Number(price.amount)
  try {
    return new Intl.NumberFormat(language, { style: 'currency', currency: price.currency }).format(
      amount,
    )
  } catch {
    return `${price.amount} ${price.currency}`
  }
}
