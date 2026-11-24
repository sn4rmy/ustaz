import { useRef } from 'react'

import { gsap, ScrollTrigger, useGSAP } from '../motion/gsap'
import { MEDIA } from '../motion/tokens'

const CELL = 32

// Grid cells that light up like selected cells of a table: [column, row].
const CELLS = [
  [3, 4], [4, 4], [9, 2], [14, 7], [15, 7], [16, 7], [21, 3], [27, 9],
  [31, 5], [32, 5], [36, 11], [7, 12], [19, 14], [40, 4], [42, 13], [24, 18],
]

// Hero background: an SVG dot grid that slowly drifts while a few cells fade in and out.
// The SVG is larger than the hero, so the drift never shows an empty edge.
export function DotGrid() {
  const root = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.motion, () => {
        const drift = gsap.to(root.current, {
          x: -CELL * 3,
          y: -CELL * 2,
          duration: 24,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
        const glow = gsap.from('.grid-cell', {
          opacity: 0,
          duration: 1.8,
          ease: 'sine.inOut',
          stagger: { each: 0.6, from: 'random', repeat: -1, yoyo: true },
        })
        // No reason to animate what nobody sees.
        ScrollTrigger.create({
          trigger: root.current?.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            for (const animation of [drift, glow]) {
              if (self.isActive) animation.resume()
              else animation.pause()
            }
          },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <svg
      ref={root}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-32 -z-10 h-[calc(100%+16rem)] w-[calc(100%+16rem)] [mask-image:radial-gradient(ellipse_at_50%_40%,black_25%,transparent_70%)]"
    >
      <defs>
        <pattern id="hero-dots" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <circle cx={CELL / 2} cy={CELL / 2} r={1.4} className="fill-muted/40" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-dots)" />
      {CELLS.map(([column, row]) => (
        <rect
          key={`${column}-${row}`}
          className="grid-cell fill-primary/10 stroke-primary/40"
          x={column * CELL + 2}
          y={row * CELL + 2}
          width={CELL - 4}
          height={CELL - 4}
          rx={6}
        />
      ))}
    </svg>
  )
}
