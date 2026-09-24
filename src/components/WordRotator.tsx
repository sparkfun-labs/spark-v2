import { useEffect, useState } from 'react'
import { cx } from './ui'

/**
 * Cycles through words: the current word slides out upwards while the next one slides in from below.
 * The longest word reserves the width so the line never jumps.
 */
export function WordRotator({ words, interval = 3200, className }: { words: string[]; interval?: number; className?: string }) {
  const [{ index, prev }, setState] = useState({ index: 0, prev: -1 })

  useEffect(() => {
    if (words.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setState((s) => ({ prev: s.index, index: (s.index + 1) % words.length })), interval)
    return () => clearInterval(t)
  }, [words.length, interval])

  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '')

  return (
    <span className={cx('relative -mb-[0.12em] inline-grid overflow-hidden pb-[0.12em] whitespace-nowrap align-bottom', className)}>
      {/* Invisible sizer keeps the line from jumping between words */}
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
        {longest}
      </span>
      {prev >= 0 && (
        <span key={`out-${prev}-${index}`} className="word-out text-brand-gradient col-start-1 row-start-1" aria-hidden="true">
          {words[prev]}
        </span>
      )}
      <span key={`in-${index}`} className="word-in text-brand-gradient col-start-1 row-start-1">
        {words[index]}
      </span>
    </span>
  )
}
