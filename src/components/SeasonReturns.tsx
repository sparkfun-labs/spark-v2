import { useCallback, useEffect, useState } from 'react'
import type { Idea } from '../data/ideas'
import { formatUsd } from '../lib/links'
import { formatMultiple, returnsSource, useIdeaReturns } from '../lib/useIdeaReturns'
import { cx } from './ui'

const STAKE = 100

type Multiples = { current: number; peak: number; relaunched: boolean }

function Probe({ idea, onChange }: { idea: Idea; onChange: (slug: string, m: Multiples) => void }) {
  const returns = useIdeaReturns(idea)
  const current = returns?.current
  const peak = returns?.peak
  const relaunched = !!returns?.relaunched
  useEffect(() => {
    if (current != null && peak != null) onChange(idea.slug, { current, peak, relaunched })
  }, [idea.slug, current, peak, relaunched, onChange])
  return null
}

const signedPct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString('en-US')}%`

/**
 * "For $100 invested in each idea": what that basket is worth today and at each idea's peak.
 * Only ideas with a known entry price count; the block hides itself when there are none.
 */
export function SeasonReturns({ ideas, season }: { ideas: Idea[]; season: 1 | 2 }) {
  const eligible = ideas.filter((i) => returnsSource(i))
  const [values, setValues] = useState<Record<string, Multiples>>({})
  const onChange = useCallback(
    (slug: string, m: Multiples) =>
      setValues((v) => (v[slug]?.current === m.current && v[slug]?.peak === m.peak ? v : { ...v, [slug]: m })),
    [],
  )

  if (!eligible.length) return null

  const invested = STAKE * eligible.length
  const ready = eligible.every((i) => values[i.slug])
  const peakValue = eligible.reduce((sum, i) => sum + STAKE * (values[i.slug]?.peak ?? 0), 0)
  const currentValue = eligible.reduce((sum, i) => sum + STAKE * (values[i.slug]?.current ?? 0), 0)
  const currentRoi = (currentValue / invested - 1) * 100
  // Season 1 is closed: its second figure is what backers got back when it ended, not today's price
  const endValue = eligible.reduce((sum, i) => sum + STAKE * (1 + (i.result?.change ?? 0) / 100), 0)
  const endRoi = (endValue / invested - 1) * 100
  const ended = season === 1

  return (
    <div className="reveal mt-8 rounded-2xl border border-line bg-card p-5 shadow-card md:p-6">
      {eligible.map((idea) => (
        <Probe key={idea.slug} idea={idea} onChange={onChange} />
      ))}

      <p className="text-sm font-medium">
        For $100 invested in each idea of Season {season}
        <span className="text-muted">
          {' '}
          · {eligible.length} ideas, {formatUsd(invested)} in total
        </span>
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface p-4">
          <p className="text-xs font-medium text-muted uppercase">Peak ROI</p>
          <p className="mt-1 text-3xl font-bold text-brand tabular-nums">{ready ? signedPct((peakValue / invested - 1) * 100) : '—'}</p>
          <p className="mt-1 text-xs text-muted">{ready ? `${formatUsd(peakValue)} if sold at each idea’s peak` : 'Loading prices…'}</p>
        </div>
        {ended ? (
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs font-medium text-muted uppercase">End of Season 1</p>
            <p className={cx('mt-1 text-3xl font-bold tabular-nums', endRoi >= 0 ? 'text-success' : 'text-ink')}>{signedPct(endRoi)}</p>
            <p className="mt-1 text-xs text-muted">{formatUsd(endValue)} back to backers when the season closed</p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs font-medium text-muted uppercase">Current ROI</p>
            <p className={cx('mt-1 text-3xl font-bold tabular-nums', !ready ? '' : currentRoi >= 0 ? 'text-success' : 'text-error')}>
              {ready ? signedPct(currentRoi) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">{ready ? `${formatUsd(currentValue)} at today’s prices` : 'Loading prices…'}</p>
          </div>
        )}
      </div>

      {ready && (
        <div className="mt-4 flex flex-wrap gap-2">
          {eligible.map((idea) => (
            <span key={idea.slug} className="rounded-full bg-surface px-3 py-1 font-mono text-xs">
              ${idea.ticker}
              {values[idea.slug].relaunched && <span className="text-muted"> (relaunch)</span>}{' '}
              <span className="text-brand">{formatMultiple(values[idea.slug].peak)} peak</span>
              <span className="text-muted">
                {' '}
                · {ended ? `${signedPct(idea.result?.change ?? 0)} at the end` : `${formatMultiple(values[idea.slug].current)} now`}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
