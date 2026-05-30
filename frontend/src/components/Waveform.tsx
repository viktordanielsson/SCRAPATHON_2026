import { useEffect, useRef } from 'react'
import { CallStatus } from '@shared/protocol'
import { useSessionStore } from '../store/sessionStore'
import { riskColor } from '../lib/riskColor'

const BARS = 56

/** Animated audio waveform. Agitation + color track the current risk. */
export function Waveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const riskRef = useRef(0)
  const liveRef = useRef(false)

  const risk = useSessionStore((s) => s.risk)
  const status = useSessionStore((s) => s.status)
  riskRef.current = risk
  liveRef.current = status === CallStatus.Live

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    const render = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const r = riskRef.current
      const live = liveRef.current
      const color = riskColor(r).color
      const mid = height / 2
      const gap = width / BARS
      const energy = live ? 0.25 + (r / 100) * 0.75 : 0.04
      t += live ? 0.18 + (r / 100) * 0.22 : 0.04

      ctx.fillStyle = color
      for (let i = 0; i < BARS; i++) {
        const wob = Math.sin(i * 0.5 + t) * Math.sin(i * 0.17 + t * 0.6)
        const amp = Math.max(0.03, Math.abs(wob)) * energy
        const h = amp * (height - 4)
        const x = i * gap + gap * 0.25
        ctx.globalAlpha = live ? 0.85 : 0.4
        ctx.fillRect(x, mid - h / 2, gap * 0.5, h)
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} width={520} height={48} className="h-12 w-full" />
}
