import { useEffect, useRef, useState } from 'react'

// Re-runs `revalidate` whenever the app/tab returns to the foreground — and, if
// `intervalMs` is given, on that interval too. This is what lets an installed PWA
// or a backgrounded tab refresh its data without the user manually reloading.
export function useRevalidate(revalidate: () => void, intervalMs = 0) {
  const cb = useRef(revalidate)
  cb.current = revalidate
  useEffect(() => {
    const fire = () => { if (document.visibilityState === 'visible') cb.current() }
    window.addEventListener('focus', fire)
    document.addEventListener('visibilitychange', fire)
    const id = intervalMs > 0 ? window.setInterval(fire, intervalMs) : undefined
    return () => {
      window.removeEventListener('focus', fire)
      document.removeEventListener('visibilitychange', fire)
      if (id) clearInterval(id)
    }
  }, [intervalMs])
}

// A clock that advances every `intervalMs` and on refocus, for time-based UI
// (e.g. medication due/overdue) so it updates without a refetch or reload.
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    const id = window.setInterval(tick, intervalMs)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs])
  return now
}
