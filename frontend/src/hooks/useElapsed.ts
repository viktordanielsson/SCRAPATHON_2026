import { useEffect, useState } from 'react'

/** Live elapsed-ms counter between startedAt and endedAt (or now). */
export function useElapsed(startedAt: number | null, endedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null || endedAt !== null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [startedAt, endedAt])

  if (startedAt === null) return 0
  return Math.max(0, (endedAt ?? now) - startedAt)
}
