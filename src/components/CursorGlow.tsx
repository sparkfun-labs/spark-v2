import { useEffect, useRef } from 'react'

const SIZE = 420

/** Soft orange orb that trails the mouse (desktop pointers only). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let targetX = x
    let targetY = y
    let raf = 0

    const tick = () => {
      x += (targetX - x) * 0.12
      y += (targetY - y) * 0.12
      el.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`
      raf = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.5 ? requestAnimationFrame(tick) : 0
    }

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      el.style.opacity = '1'
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onLeave = () => {
      el.style.opacity = '0'
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={ref} aria-hidden="true" className="cursor-glow" />
}
