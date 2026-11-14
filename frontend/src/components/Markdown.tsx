import { Fragment, type ReactNode } from 'react'

// A small Markdown subset for assistant answers: paragraphs, lists, ```code blocks```,
// `inline code` and **bold**. Builds React elements, so the model's text can't inject HTML.

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={i} className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function textBlock(block: string, key: string): ReactNode {
  const lines = block.split('\n')
  if (lines.every((line) => /^\s*[-*] /.test(line))) {
    return (
      <ul key={key} className="list-disc space-y-1 pl-5">
        {lines.map((line, i) => (
          <li key={i}>{inline(line.replace(/^\s*[-*] /, ''))}</li>
        ))}
      </ul>
    )
  }
  if (lines.every((line) => /^\s*\d+[.)] /.test(line))) {
    return (
      <ol key={key} className="list-decimal space-y-1 pl-5">
        {lines.map((line, i) => (
          <li key={i}>{inline(line.replace(/^\s*\d+[.)] /, ''))}</li>
        ))}
      </ol>
    )
  }
  return (
    <p key={key} className="whitespace-pre-line">
      {inline(block)}
    </p>
  )
}

export function Markdown({ text }: { text: string }) {
  const parts = text.split(/```(?:[\w-]*)\n?([\s\S]*?)```/g)
  return (
    <div className="flex flex-col gap-3 leading-relaxed">
      {parts.map((part, i) => {
        // Odd indexes are the contents of code blocks.
        if (i % 2 === 1) {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-surface-muted p-3 font-mono text-sm"
            >
              <code>{part.replace(/\n$/, '')}</code>
            </pre>
          )
        }
        return part
          .split(/\n{2,}/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, j) => textBlock(block, `${i}-${j}`))
      })}
    </div>
  )
}
