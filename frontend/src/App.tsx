import { useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { useSession } from './hooks/useSession'

export default function App() {
  const controls = useSession()

  useEffect(() => {
    // ?scenario=<id> autoplays on load (handy for "show me again").
    const requested = new URLSearchParams(window.location.search).get('scenario')
    if (requested) controls.start(requested)

    // [R] resets to a clean Standby between demo runs.
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') controls.resetDemo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // controls is recreated each render but its methods are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AppShell controls={controls} />
}
