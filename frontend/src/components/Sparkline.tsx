interface Props {
  data: number[]
  color: string
  width?: number
  height?: number
}

/** Minimal risk-trend sparkline. Clean polyline, no axes — pure data-ink. */
export function Sparkline({ data, color, width = 150, height = 30 }: Props) {
  if (data.length < 2) return <svg width={width} height={height} aria-hidden />

  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - (clamp(d) / 100) * (height - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.9}
      />
    </svg>
  )
}
