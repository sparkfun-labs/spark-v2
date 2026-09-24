import { useEffect, useRef } from 'react'
import type { Idea } from '../data/ideas'
import { IdeaTile } from './IdeaCard'
import { cx } from './ui'

/**
 * Idea tiles drifting left in a seamless loop (the list is rendered twice).
 * Hovering eases the row to a stop instead of freezing it abruptly, and it eases back on leave.
 */
export function IdeaMarquee({ ideas }: { ideas: Idea[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rate = useRef(1)
  const target = useRef(1)
  const raf = useRef(0)

  const step = () => {
    const animation = trackRef.current?.getAnimations()[0]
    if (!animation) {
      raf.current = 0
      return
    }
    const next = rate.current + (target.current - rate.current) * 0.1
    rate.current = Math.abs(next - target.current) < 0.01 ? target.current : next
    // Changing playbackRate keeps the current position, so the row never jumps
    animation.playbackRate = rate.current
    raf.current = rate.current === target.current ? 0 : requestAnimationFrame(step)
  }

  const easeTo = (value: number) => {
    target.current = value
    if (!raf.current) raf.current = requestAnimationFrame(step)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <div
      className="marquee reveal mx-auto mt-6 max-w-[1072px] overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      onPointerEnter={() => easeTo(0)}
      onPointerLeave={() => easeTo(1)}
      onFocus={() => easeTo(0)}
      onBlur={() => easeTo(1)}
    >
      <div ref={trackRef} className="marquee-track flex w-max gap-3 pr-3">
        {[...ideas, ...ideas].map((idea, k) => {
          const duplicate = k >= ideas.length
          return (
            <div key={`${idea.slug}-${k}`} className={cx('w-[220px] shrink-0', duplicate && 'marquee-dup')} aria-hidden={duplicate || undefined}>
              {/* Duplicates stay clickable (they fill the loop) but are skipped by keyboard and screen readers */}
              <IdeaTile idea={idea} tabIndex={duplicate ? -1 : undefined} staticProgress />
            </div>
          )
        })}
      </div>
    </div>
  )
}
