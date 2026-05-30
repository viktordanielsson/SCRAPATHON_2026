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
    <section className={clsx('flex flex-col rounded-md border border-edge bg-panel/60', className)}>
      {title && (
        <header className="flex items-center justify-between border-b border-edge px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {title}
          </span>
          {right}
        </header>
      )}
      <div className={clsx('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}
