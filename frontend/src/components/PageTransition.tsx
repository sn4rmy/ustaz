import { type ReactNode, useRef } from 'react'
import { useLocation } from 'react-router'

import { gsap, useGSAP } from '../motion/gsap'
import { DURATION, EASE, MEDIA } from '../motion/tokens'

// When the address changes, the page content fades in and rises a little.
// The page itself is not re-created, so its state and requests stay as they are.
export function PageTransition({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MEDIA.motion, () => {
        gsap.from(root.current, {
          opacity: 0,
          y: 8,
          duration: DURATION.page,
          ease: EASE.out,
          // A leftover transform would turn the wrapper into a containing block.
          clearProps: 'transform',
        })
      })
      return () => mm.revert()
    },
    { dependencies: [pathname], revertOnUpdate: true },
  )

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  )
}
