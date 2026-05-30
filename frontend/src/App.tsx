export default function App() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 font-mono">
      <div className="text-xs tracking-[0.3em] text-accent">SENTINEL</div>
      <h1 className="text-2xl font-semibold text-ink">Social Engineering Detection</h1>
      <p className="max-w-md text-center text-sm text-muted">
        Real-time call monitoring dashboard. Scaffold is live — UI panels and the backend
        event contract land next.
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-safe">
        <span className="h-2 w-2 animate-pulse rounded-full bg-safe" />
        SYSTEM STANDBY
      </div>
    </div>
  )
}
