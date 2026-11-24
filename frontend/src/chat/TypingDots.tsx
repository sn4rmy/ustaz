import { useRef } from 'react'

import { gsap, useGSAP } from '../motion/gsap'
import { MEDIA } from '../motion/tokens'

// "Assistant is typing…": three dots hop one after another. With reduced motion they stand still.
export function TypingDots({ label }: { label: string }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MEDIA.motion, () => {
        gsap.to('.typing-dot', {
          y: -4,
          duration: 0.35,
          ease: 'sine.inOut',
          stagger: { each: 0.15, repeat: -1, yoyo: true },
        })
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} role="status" className="flex items-center gap-3 text-sm text-muted">
      <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-surface px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} aria-hidden="true" className="typing-dot size-1.5 rounded-full bg-muted" />
        ))}
      </span>
      {label}
    </div>
  )
}
