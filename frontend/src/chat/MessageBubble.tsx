import { useTranslation } from 'react-i18next'

import type { Message } from '../api/types'
import { Markdown } from '../components/Markdown'
import { Badge } from '../components/ui'

export function MessageBubble({ message }: { message: Message }) {
  const { t } = useTranslation()

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-fg">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 sm:max-w-[85%]">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-text">
            {message.agent ? t(`chat.agents.${message.agent}`) : t('chat.agents.assistant')}
          </span>
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
                  className="rounded-md bg-primary-soft px-2 py-1 text-xs text-primary"
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
