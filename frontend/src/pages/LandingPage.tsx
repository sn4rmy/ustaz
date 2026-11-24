import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { AgentsScene } from '../landing/AgentsScene'
import { HeroScene } from '../landing/HeroScene'
import { LandingFooter } from '../landing/LandingFooter'
import { LandingHeader } from '../landing/LandingHeader'
import { PricingCta } from '../landing/PricingCta'
import { ProgressScene } from '../landing/ProgressScene'
import { SandboxScene } from '../landing/SandboxScene'
import { TopicsScene } from '../landing/TopicsScene'
import { ScrollTrigger } from '../motion/scroll'
import { useLenis } from '../motion/useLenis'

// Public home page. Scenes go top to bottom in the order their ScrollTriggers must be
// created: a pinned scene adds scroll space that every scene below depends on.
export function LandingPage() {
  const { i18n } = useTranslation()
  useLenis()

  // New texts or a late font change the heights, so the scroll positions are recalculated.
  useEffect(() => {
    void document.fonts.ready.then(() => ScrollTrigger.refresh())
    ScrollTrigger.refresh()
  }, [i18n.language])

  // Opening another page from the bottom of this one should start at its top.
  useEffect(() => () => window.scrollTo(0, 0), [])

  return (
    <div className="overflow-x-clip">
      <LandingHeader />
      <main>
        <HeroScene />
        <AgentsScene />
        <SandboxScene />
        <TopicsScene />
        <ProgressScene />
        <PricingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
