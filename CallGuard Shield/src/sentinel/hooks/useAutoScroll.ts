import { useEffect, useRef } from 'react'

/**
 * Keep a scroll container pinned to the bottom whenever `dep` changes.
 * Uses instant scrolling: during a live transcript `dep` changes many times a
 * second, and smooth-scroll on every change queues animations that visibly lag.
 */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dep])
  return ref
}
