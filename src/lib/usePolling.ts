import { useEffect } from 'react'

/**
 * Calls `tick` every `ms` while the page is visible, and once right away when it becomes visible again.
 * Background tabs used to keep polling Solana forever; this is where most RPC calls came from.
 */
export function usePolling(tick: () => void, ms: number | null) {
  useEffect(() => {
    if (ms == null) return
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') tick()
    }, ms)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tick, ms])
}
