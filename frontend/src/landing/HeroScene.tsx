import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../auth/context'
import { ButtonAnchor, ButtonLink } from '../components/ui'
import { gsap, SplitText, useGSAP } from '../motion/scroll'
import { DURATION, EASE, MEDIA } from '../motion/tokens'
import { DotGrid } from './DotGrid'
import { SectionLabel } from './SectionLabel'

// 01. Title lines rise one by one on load; while scrolling away, the first screen
// shrinks and fades together with the scroll (scrub).
export function HeroScene() {
  const { t } = useTranslation()
  const { status } = useAuth()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.motion, () => {
        // autoSplit re-splits the lines when the font loads or the width changes;
        // the animation returned from onSplit is then rebuilt by SplitText itself.
        const split = SplitText.create('.hero-title', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: DURATION.slow,
              ease: EASE.out,
              stagger: 0.12,
            }),
        })
        gsap.from('.hero-fade', {
          opacity: 0,
          y: 24,
          duration: DURATION.slow,
          ease: EASE.out,
          delay: 0.35,
          stagger: 0.1,
        })
        gsap.to('.hero-content', {
          scale: 0.86,
          opacity: 0,
          y: -80,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        return () => split.revert()
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const signedIn = status === 'authenticated'

  return (
    <section
      ref={root}
      className="relative isolate flex min-h-svh items-center overflow-hidden pt-20 pb-16"
    >
      <DotGrid />
      <div className="hero-content mx-auto w-full max-w-6xl px-4">
        <div className="hero-fade">
          <SectionLabel number="01" text={t('landing.hero.label')} />
        </div>
        <h1 className="hero-title mt-6 max-w-4xl font-display text-[2.6rem] leading-[1.02] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {t('landing.hero.title')}
        </h1>
        <p className="hero-fade mt-6 max-w-2xl text-base text-muted sm:text-lg">
          {t('landing.hero.text')}
        </p>
        <div className="hero-fade mt-8 flex flex-wrap gap-3">
          {signedIn ? (
            <ButtonLink to="/chat" className="px-6">
              {t('landing.nav.openChat')}
            </ButtonLink>
          ) : (
            <ButtonLink to="/register" className="px-6">
              {t('landing.hero.start')}
            </ButtonLink>
          )}
          <ButtonAnchor href="#agents" variant="secondary" className="px-6">
            {t('landing.hero.how')}
          </ButtonAnchor>
        </div>
      </div>
    </section>
  )
}
