// "02 / Three agents" above each section title.
export function SectionLabel({ number, text }: { number: string; text: string }) {
  return (
    <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
      <span className="text-primary">{number}</span> / {text}
    </p>
  )
}
