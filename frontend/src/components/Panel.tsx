import clsx from 'clsx'
import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function Panel({ title, right, children, className, bodyClassName }: PanelProps) {
  return (
    <section
      className={clsx(
        'flex flex-col rounded-lg border border-hairline bg-surface shadow-card',
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            {title}
          </span>
          {right}
        </header>
      )}
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
