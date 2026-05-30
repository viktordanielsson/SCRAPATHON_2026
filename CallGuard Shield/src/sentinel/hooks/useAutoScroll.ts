import { useEffect, useRef } from 'react'

/** Keep a scroll container pinned to the bottom whenever `dep` changes. */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [dep])
  return ref
}
