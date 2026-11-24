import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { gsap, useGSAP } from '../motion/scroll'
import { markAnimated } from '../motion/scene'
import { MEDIA } from '../motion/tokens'
import { AgentsList } from './AgentsList'
import { SectionLabel } from './SectionLabel'

// The diagram is drawn in a 640 x 460 box: SVG lines use these numbers directly,
// HTML cards are placed by the same numbers turned into percentages.
const WIDTH = 640
const HEIGHT = 460
const BUS_Y = 290 // where the line from the orchestrator splits into three

const NODES = [
  { id: 'question', x: 320, y: 44, scatter: { x: -260, y: -40, rotation: -14 } },
  { id: 'orchestrator', x: 320, y: 190, scatter: { x: 40, y: 90, rotation: 8 } },
  { id: 'teacher', x: 100, y: 390, scatter: { x: -140, y: 70, rotation: -18 } },
  { id: 'examiner', x: 320, y: 390, scatter: { x: 30, y: 160, rotation: 12 } },
  { id: 'mentor', x: 540, y: 390, scatter: { x: 170, y: -60, rotation: 16 } },
] as const

const AGENTS = ['teacher', 'examiner', 'mentor'] as const

const LINES = [
  `M320 44 V190`,
  ...AGENTS.map((_, i) => {
    const x = NODES[i + 2].x
    return `M320 190 V${BUS_Y} H${x} V390`
  }),
]

// The "message" dot travels question -> orchestrator -> agent along the same lines.
function routeTo(x: number) {
  return [
    { x: 320, y: 190, ease: 'none' },
    { x: 320, y: BUS_Y, ease: 'none' },
    { x, y: BUS_Y, ease: 'none' },
    { x, y: 390, ease: 'none' },
  ]
}

const percent = (value: number, total: number) => `${(value / total) * 100}%`

// 02. Main scene. The section is pinned for three screens of scrolling. One scrubbed
// timeline, step by step: scattered parts assemble, lines draw, then a message runs
// to each agent while the caption next to the diagram changes.
export function AgentsScene() {
  const { t } = useTranslation()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia(root.current ?? undefined)
      mm.add(MEDIA.desktop, () => {
        const section = root.current
        if (!section) return
        const captions = gsap.utils.toArray<HTMLElement>('.agent-caption')
        gsap.set(captions.slice(1), { autoAlpha: 0, y: 24 })
        gsap.set('.agent-line', { strokeDasharray: 1, strokeDashoffset: 1 })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=300%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        })

        tl.addLabel('scatter')
          .from('.agent-card', {
            x: (i: number) => NODES[i].scatter.x,
            y: (i: number) => NODES[i].scatter.y,
            rotation: (i: number) => NODES[i].scatter.rotation,
            scale: 0.9,
            duration: 2,
            ease: 'power2.out',
          })
          .addLabel('lines')
          .to('.agent-line', { strokeDashoffset: 0, duration: 1, stagger: 0.3 })

        AGENTS.forEach((agent, i) => {
          tl.addLabel(agent)
            .to('.agent-glow', { opacity: 0, duration: 0.2 })
            .set('.agent-dot', { x: 320, y: 44, autoAlpha: 1 })
            .to('.agent-dot', { keyframes: routeTo(NODES[i + 2].x), duration: 1.2 })
            .to(`.agent-glow-${agent}`, { opacity: 1, duration: 0.3 }, '<0.9')
            .to(captions[i], { autoAlpha: 0, y: -24, duration: 0.4 }, '<')
            .to(captions[i + 1], { autoAlpha: 1, y: 0, duration: 0.4 }, '>')
            .set('.agent-dot', { autoAlpha: 0 })
            .to({}, { duration: 0.6 }) // a pause, so each step stays on screen for a while
        })
        tl.addLabel('end')

        return markAnimated(section)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  const nodeTitle: Record<string, string> = {
    question: t('landing.agents.question'),
    orchestrator: t('landing.agents.orchestrator'),
    teacher: t('chat.agents.teacher'),
    examiner: t('chat.agents.examiner'),
    mentor: t('chat.agents.mentor'),
  }

  return (
    <section
      ref={root}
      id="agents"
      className="relative overflow-x-clip border-y border-border bg-surface md:flex md:min-h-svh md:items-center"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-24 pb-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center md:pt-20 md:pb-10">
        <div>
          <SectionLabel number="02" text={t('landing.agents.label')} />
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {t('landing.agents.title')}
          </h2>
          {/* All captions are visible as a list; while animated they stack in one place. */}
          <ol className="mt-8 hidden gap-5 md:grid">
            {(['orchestrator', ...AGENTS] as const).map((step, i) => (
              <li key={step} className="agent-caption animated:[grid-area:1/1]">
                <p className="font-mono text-xs text-primary">0{i + 1}</p>
                <p className="mt-1 text-lg font-semibold">{nodeTitle[step]}</p>
                <p className="mt-1 text-muted">{t(`landing.agents.steps.${step}`)}</p>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="relative hidden w-full md:block"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {LINES.map((d) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                className="agent-line fill-none stroke-primary/50"
                strokeWidth={2}
              />
            ))}
            <circle className="agent-dot fill-primary" r={7} opacity={0} />
          </svg>

          {NODES.map((node) => (
            <div
              key={node.id}
              className="agent-card absolute w-[30%] min-w-36 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg p-3 text-center shadow-card"
              style={{ left: percent(node.x, WIDTH), top: percent(node.y, HEIGHT) }}
            >
              {node.id !== 'question' && node.id !== 'orchestrator' && (
                <span
                  aria-hidden="true"
                  className={`agent-glow agent-glow-${node.id} pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-primary opacity-0`}
                />
              )}
              <p className="text-sm font-semibold">{nodeTitle[node.id]}</p>
              <p className={`mt-0.5 text-xs text-muted ${node.id === 'question' ? 'italic' : ''}`}>
                {node.id === 'question'
                  ? t('landing.agents.questionText')
                  : t(`landing.agents.roles.${node.id}`)}
              </p>
            </div>
          ))}
        </div>

        <AgentsList titles={nodeTitle} />
      </div>
    </section>
  )
}
