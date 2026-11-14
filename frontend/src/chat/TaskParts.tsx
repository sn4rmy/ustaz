import { useTranslation } from 'react-i18next'

import type { Cell, TableSchema } from '../api/types'

export function SchemaView({ schema }: { schema: TableSchema[] }) {
  const { t } = useTranslation()
  if (schema.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{t('task.schema')}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {schema.map((table) => (
          <div key={table.table} className="rounded-lg border border-border">
            <p className="border-b border-border bg-surface-muted px-3 py-1.5 font-mono text-sm font-semibold">
              {table.table}
            </p>
            <ul className="px-3 py-2 font-mono text-xs">
              {table.columns.map((column) => {
                const [name, ...type] = column.split(' ')
                return (
                  <li key={column} className="flex justify-between gap-3 py-0.5">
                    <span>{name}</span>
                    <span className="text-muted">{type.join(' ')}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCell(value: Cell): string {
  if (value === null) return 'NULL'
  return String(value)
}

export function ResultTable({ columns, rows }: { columns: string[]; rows: Cell[][] }) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        {t('task.result', { count: rows.length })}
      </p>
      <div className="max-h-80 overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse font-mono text-sm">
          <thead className="sticky top-0 bg-surface-muted">
            <tr>
              {columns.map((column, i) => (
                <th key={i} className="border-b border-border px-3 py-2 text-left font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface even:bg-surface-muted/50">
                {row.map((value, j) => (
                  <td
                    key={j}
                    className={`border-b border-border px-3 py-1.5 ${value === null ? 'text-muted italic' : ''}`}
                  >
                    {formatCell(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
