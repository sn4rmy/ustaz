import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { gsap, useGSAP } from '../motion/scroll'
import { markAnimated } from '../motion/scene'
import { MEDIA } from '../motion/tokens'
import { SectionLabel } from './SectionLabel'

// One line of SQL per topic, in the same order as the topics in the translations.
const TOPIC_CODE = [
  "WHERE group_name = 'IT-2401'",
  'ORDER BY grade DESC LIMIT 3',
  'GROUP BY group_name',
  'JOIN grades g ON g.student_id = s.id',
  'WHERE id NOT IN (SELECT …)',
]

interface TopicText {
  title: string
  text: string
}

// 04. On desktop the section is pinned and the row of cards slides left while the page
// scrolls down; the scroll distance equals how far the row sticks out of the screen.
// On phones and with reduced motion it is a normal row you swipe inside the block.
export function TopicsScene() {
  const { t } = useTranslation()
  const root = useRef<HTMLElement>(null)
  const topics = t('landing.topics.items', { returnObjects: true }) as TopicText[]

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.desktop, () => {
        const section = root.current
        const track = section?.querySelector<HTMLElement>('.topics-track')
        const frame = track?.parentElement
        if (!section || !track || !frame) return
        const distance = () => Math.max(0, track.scrollWidth - frame.clientWidth)

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true, // widths change with the window and the language
          },
        })
        return markAnimated(section)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative overflow-x-clip md:flex md:min-h-svh md:items-center">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:pt-20 md:pb-10">
        <SectionLabel number="04" text={t('landing.topics.label')} />
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          {t('landing.topics.title')}
        </h2>

        <div className="-mx-4 mt-10 snap-x snap-mandatory overflow-x-auto px-4 pb-4 animated:overflow-visible">
          <ol className="topics-track flex w-max gap-4">
            {Array.isArray(topics) &&
              topics.map((topic, i) => (
                <li
                  key={topic.title}
                  className="flex w-[min(78vw,22rem)] shrink-0 snap-start flex-col rounded-[20px] border border-border bg-surface p-6 shadow-card"
                >
                  <span className="font-display text-5xl font-bold text-primary/25">0{i + 1}</span>
                  <h3 className="mt-6 text-xl font-semibold">{topic.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{topic.text}</p>
                  <code className="mt-6 block truncate rounded-lg bg-surface-muted px-3 py-2 font-mono text-xs">
                    {TOPIC_CODE[i]}
                  </code>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
