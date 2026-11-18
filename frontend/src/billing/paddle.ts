import { initializePaddle, type Paddle, type PaddleEventData } from '@paddle/paddle-js'

import type { Language } from '../api/types'

export type CheckoutEvent = 'completed' | 'closed' | 'error'

interface CheckoutOptions {
  environment: 'sandbox' | 'production'
  clientToken: string
  priceId: string
  email: string
  customData: Record<string, string>
  language: Language
}

// Paddle.js is loaded from Paddle's CDN once; events go to the checkout opened last.
let paddle: Promise<Paddle | undefined> | null = null
let onEvent: ((event: CheckoutEvent) => void) | null = null

function handle(event: PaddleEventData) {
  const name = String(event.name ?? '')
  if (name === 'checkout.completed') onEvent?.('completed')
  else if (name === 'checkout.closed') onEvent?.('closed')
  else if (name === 'checkout.error' || name === 'checkout.payment.error') onEvent?.('error')
}

export async function openPaddleCheckout(
  options: CheckoutOptions,
  listener: (event: CheckoutEvent) => void,
): Promise<void> {
  onEvent = listener
  paddle ??= initializePaddle({
    environment: options.environment,
    token: options.clientToken,
    eventCallback: handle,
  })
  const instance = await paddle
  if (!instance) {
    // Allow another try, e.g. after an ad blocker is turned off.
    paddle = null
    throw new Error('paddle_unavailable')
  }
  instance.Checkout.open({
    items: [{ priceId: options.priceId, quantity: 1 }],
    customer: { email: options.email },
    customData: options.customData,
    // Paddle has no Kazakh checkout, Russian is the closest.
    settings: { displayMode: 'overlay', locale: options.language === 'en' ? 'en' : 'ru' },
  })
}
