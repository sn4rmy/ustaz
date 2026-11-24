import 'lenis/dist/lenis.css'

import Lenis from 'lenis'
import { useEffect } from 'react'

import { gsap, ScrollTrigger } from './scroll'
import { prefersReducedMotion } from './tokens'

// Smooth scrolling for the landing page only. Wiring follows the Lenis README:
// GSAP's ticker drives Lenis, and every Lenis scroll updates ScrollTrigger.
export function useLenis() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    // anchors: links like #agents scroll smoothly instead of being blocked.
    const lenis = new Lenis({ anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      // GSAP defaults, so the other pages behave as before.
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [])
}
