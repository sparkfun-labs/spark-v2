import { useEffect, useState } from 'react'

export function useCountdown(target?: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])

  if (!target) return null
  const diff = Math.max(0, new Date(target).getTime() - now)
  const s = Math.floor(diff / 1000)
  return {
    done: diff === 0,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}
