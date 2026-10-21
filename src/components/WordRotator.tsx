import { useEffect, useState } from 'react'
import { cx } from './ui'

const TYPE_MS = 85
const DELETE_MS = 45
const HOLD_MS = 1800
const NEXT_MS = 350

/**
 * Typewriter: each word is typed letter by letter, the caret blinks while it holds, then the word is erased
 * letter by letter and the next one is typed. The longest word reserves the space so the line never jumps.
 */
export function WordRotator({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing')
  const word = words[index] ?? ''

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLength(word.length)
      setPhase('holding')
      return
    }
    let t: ReturnType<typeof setTimeout>
    if (phase === 'typing') {
      t = length < word.length ? setTimeout(() => setLength(length + 1), TYPE_MS) : setTimeout(() => setPhase('holding'), 0)
    } else if (phase === 'holding') {
      if (words.length < 2) return
      t = setTimeout(() => setPhase('deleting'), HOLD_MS)
    } else if (length > 0) {
      t = setTimeout(() => setLength(length - 1), DELETE_MS)
    } else {
      t = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length)
        setPhase('typing')
      }, NEXT_MS)
    }
    return () => clearTimeout(t)
  }, [phase, length, word.length, words.length])

  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), '')

  return (
    <span className={cx('relative inline-grid whitespace-nowrap align-bottom', className)}>
      <span className="sr-only">{words.join(', ')}</span>
      {/* Invisible sizer keeps the line from jumping between words. It has the gradient text's styles (its bottom
          padding included), so the line is exactly as tall whether the word is fully typed or erased. */}
      <span className="text-brand-gradient invisible col-start-1 row-start-1" aria-hidden="true">
        {longest}
        {/* Room for the caret after the longest word */}
        <span className="ml-[0.04em] inline-block w-[0.07em]" />
      </span>
      <span className="col-start-1 row-start-1 inline-flex items-center" aria-hidden="true">
        <span className="text-brand-gradient">{word.slice(0, length)}</span>
        <span className={cx('ml-[0.04em] inline-block h-[0.85em] w-[0.07em] rounded-full bg-brand', phase === 'holding' && 'caret-blink')} />
      </span>
    </span>
  )
}
