import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/** Smoothly animate a displayed integer from its current value to `target`. */
export function useCountUp(target: number, duration = 0.45): number {
  const [display, setDisplay] = useState(target)
  const current = useRef(target)

  useEffect(() => {
    const controls = animate(current.current, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        current.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [target, duration])

  return Math.round(display)
}
