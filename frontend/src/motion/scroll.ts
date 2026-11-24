import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

import { gsap, useGSAP } from './gsap'

// Scroll plugins for the landing page. Landing files import GSAP from here,
// so the plugins are registered before any scene runs.
gsap.registerPlugin(ScrollTrigger, SplitText)

export { gsap, ScrollTrigger, SplitText, useGSAP }
