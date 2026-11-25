import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { Message } from '../api/types'
import { Markdown } from '../components/Markdown'
import { Badge } from '../components/ui'
import { gsap, useGSAP } from '../motion/gsap'
import { DURATION, EASE, MEDIA } from '../motion/tokens'

// appear: the message has just arrived, so it fades in. History loads without it.
export function MessageBubble({ message, appear = false }: { message: Message; appear?: boolean }) {
  const { t } = useTranslation()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!appear) return
    const mm = gsap.matchMedia()
    mm.add(MEDIA.motion, () => {
      gsap.from(root.current, { opacity: 0, y: 12, duration: DURATION.base, ease: EASE.out })
    })
    return () => mm.revert()
  })

  if (message.role === 'user') {
    return (
      <div ref={root} className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-fg shadow-card">
          {message.content}
        </div>
      </div>
    )
  }

  const name = message.agent ? t(`chat.agents.${message.agent}`) : t('chat.agents.assistant')

  return (
    <div ref={root} className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary"
      >
        {name.charAt(0)}
      </span>
      <div className="w-full max-w-[88%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 shadow-card sm:max-w-[80%]">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-text">{name}</span>
          {message.ai_generated && (
            <Badge className="bg-warning-soft text-warning">{t('chat.aiGenerated')}</Badge>
          )}
        </div>
        <Markdown text={message.content} />
        {message.citations.length > 0 && (
          <div className="mt-3 border-t border-border pt-2">
            <p className="text-xs font-medium text-muted">{t('chat.sources')}</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {message.citations.map((citation) => (
                <li
                  key={`${citation.material_id}-${citation.chunk_id}`}
                  className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary"
                  title={t('chat.sourceFragment', { id: citation.chunk_id })}
                >
                  {citation.material_title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
