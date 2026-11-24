// Shared timing so every scene moves at the same pace. Seconds, as GSAP expects.
export const DURATION = {
  fast: 0.2,
  base: 0.45,
  slow: 0.9,
}

export const EASE = {
  out: 'power3.out',
  inOut: 'power2.inOut',
}

// Conditions for gsap.matchMedia(). Animations are only set up inside `motion`, `desktop`
// or `mobile`, so with reduced motion nothing is hidden, pinned or moved.
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia(MEDIA.reduce).matches
}
