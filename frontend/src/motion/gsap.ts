import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'

// Core GSAP for the whole app. The scroll plugins are registered in scroll.ts,
// which only the landing page imports, so they stay out of the main chunk.
gsap.registerPlugin(useGSAP)

export { gsap, useGSAP }
