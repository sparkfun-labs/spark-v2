import { useCallback, useEffect, useState } from 'react'
import type { Idea } from '../data/ideas'
import { useDaoProposals } from '../lib/useDaoProposals'
import { LINKS } from '../lib/links'
import { HeroIdeaCard, useLiveIdea } from './IdeaCard'
import { LogoMark } from './Logo'
import { Button, TelegramLogo, cx } from './ui'

const INTERVAL_MS = 5_000

/** Reports whether an idea has something to act on right now: an open raise or an open proposal. */
function ActivityProbe({ idea, onChange }: { idea: Idea; onChange: (slug: string, active: boolean) => void }) {
  const live = useLiveIdea(idea)
  const proposals = useDaoProposals(live.launch?.dao)
  const active = live.status === 'live' || !!proposals?.some((p) => p.status === 'pending')
  useEffect(() => onChange(idea.slug, active), [idea.slug, active, onChange])
  return null
}

function PitchCard() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-card/80 p-6 text-center shadow-card backdrop-blur-xl">
      <LogoMark className="h-24 w-24" />
      <div>
        <p className="text-2xl font-bold">Got an idea?</p>
        <p className="mt-2 text-sm text-muted">
          Solo founder or small team? We raise 3 months of runway on Backable for ideas worth building.
        </p>
      </div>
      <Button variant="solid" className="w-full" href={LINKS.telegram}>
        <TelegramLogo className="h-4 w-4" /> Pitch it on Telegram
      </Button>
    </div>
  )
}

/**
 * Hero card. Ideas with an open raise or an open proposal take the spot; when nothing is live,
 * every Season 2 idea rotates, followed by a call to pitch an idea on Telegram.
 */
export function HeroCarousel({ ideas }: { ideas: Idea[] }) {
  const [activity, setActivity] = useState<Record<string, boolean>>({})
  const onChange = useCallback(
    (slug: string, active: boolean) => setActivity((a) => (a[slug] === active ? a : { ...a, [slug]: active })),
    [],
  )
  const active = ideas.filter((i) => activity[i.slug])
  const slides: { key: string; idea?: Idea }[] = active.length
    ? active.map((idea) => ({ key: idea.slug, idea }))
    : [...ideas.map((idea) => ({ key: idea.slug, idea })), { key: 'pitch' }]

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = slides.length
  const current = index % count

  useEffect(() => {
    if (count < 2 || paused) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [count, paused])

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {ideas.map((idea) => (
        <ActivityProbe key={idea.slug} idea={idea} onChange={onChange} />
      ))}

      {/* All slides share one grid cell, so the carousel keeps the height of the tallest one */}
      <div className="grid">
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            inert={i !== current}
            className={cx(
              'transition duration-700 [grid-area:1/1]',
              i === current ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
            )}
          >
            {slide.idea ? <HeroIdeaCard idea={slide.idea} className="h-full" /> : <PitchCard />}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              aria-label={slide.idea ? `Show $${slide.idea.ticker}` : 'Show how to pitch an idea'}
              onClick={() => setIndex(i)}
              className={cx('h-1.5 rounded-full transition-all', i === current ? 'w-6 bg-brand' : 'w-1.5 bg-muted/40 hover:bg-muted')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
