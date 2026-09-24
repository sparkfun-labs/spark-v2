import { useEffect, useRef, useState } from 'react'
import { useInView } from '../lib/useInView'

// prefix ("$"), number ("1,234.5"), suffix ("K+")
const PARSE = /^([^\d-]*)(-?\d[\d,]*(?:\.\d+)?)(.*)$/s

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t))

/**
 * Animates the numeric part of a value ("$71K+", "64", "$0.00559") from its previous value
 * when it scrolls into view, and again whenever it changes. Non-numeric values render as-is.
 */
export function CountUp({ value, duration = 1400 }: { value: string | number; duration?: number }) {
  const text = String(value)
  const match = text.match(PARSE)
  const [ref, inView] = useInView<HTMLSpanElement>(0.3)
  const current = useRef(0)
  const [shown, setShown] = useState(0)

  const hasMatch = match !== null
  const target = match ? Number(match[2].replace(/,/g, '')) : 0
  const decimals = match?.[2].split('.')[1]?.length ?? 0
  const grouping = !!match?.[2].includes(',')

  // Depends on primitives only: the regex match array is recreated every render.
  useEffect(() => {
    if (!hasMatch || !inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target
      setShown(target)
      return
    }
    const from = current.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const v = from + (target - from) * easeOutExpo(t)
      current.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, inView, duration, hasMatch])

  // The ref stays attached even without a number, so the observer already watches the element
  // when the value arrives (prices load after the first render).
  if (!match) return <span ref={ref}>{text}</span>

  const formatted = shown.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  })

  return (
    <span ref={ref} className="tabular-nums">
      {match[1]}
      {formatted}
      {match[3]}
    </span>
  )
}
