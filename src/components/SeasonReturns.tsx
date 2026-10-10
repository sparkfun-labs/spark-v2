import { useCallback, useEffect, useState } from 'react'
import type { Idea } from '../data/ideas'
import { formatUsd } from '../lib/links'
import { formatMultiple, returnsSource, seasonOneValueBack, useIdeaReturns } from '../lib/useIdeaReturns'
import { cx } from './ui'

const STAKE = 100

type Multiples = { current: number; peak: number; relaunched: boolean; twap?: number }

function Probe({ idea, onChange }: { idea: Idea; onChange: (slug: string, m: Multiples) => void }) {
  const returns = useIdeaReturns(idea)
  const current = returns?.current
  const peak = returns?.peak
  const relaunched = !!returns?.relaunched
  const twap = returns?.twap?.multiple
  useEffect(() => {
    // Relaunched ideas also wait for their coin's 3-month TWAP
    if (current != null && peak != null && (!relaunched || twap != null)) onChange(idea.slug, { current, peak, relaunched, twap })
  }, [idea.slug, current, peak, relaunched, twap, onChange])
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
      setValues((v) => (v[slug]?.current === m.current && v[slug]?.peak === m.peak && v[slug]?.twap === m.twap ? v : { ...v, [slug]: m })),
    [],
  )

  if (!eligible.length) return null

  const invested = STAKE * eligible.length
  const ready = eligible.every((i) => values[i.slug])
  const peakValue = eligible.reduce((sum, i) => sum + STAKE * (values[i.slug]?.peak ?? 0), 0)
  const currentValue = eligible.reduce((sum, i) => sum + STAKE * (values[i.slug]?.current ?? 0), 0)
  const currentRoi = (currentValue / invested - 1) * 100
  // Season 1 is closed: its second figure is what backers got back (USDC refunds, plus the Season 2 coin
  // of relaunched ideas as if $100 had been reinvested at its raise price, valued at its 3-month TWAP)
  const ended = season === 1
  const backOf = (i: Idea) => seasonOneValueBack(i, values[i.slug]?.twap) ?? 0
  const backValue = eligible.reduce((sum, i) => sum + STAKE * backOf(i), 0)
  const refunds = eligible.reduce((sum, i) => sum + STAKE * (1 + (i.result?.change ?? 0) / 100), 0)
  const backRoi = (backValue / invested - 1) * 100

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
            <p className="text-xs font-medium text-muted uppercase">Value back to backers</p>
            <p className={cx('mt-1 text-3xl font-bold tabular-nums', !ready ? '' : backRoi >= 0 ? 'text-success' : 'text-ink')}>
              {ready ? signedPct(backRoi) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {ready ? `${formatUsd(backValue)}: ${formatUsd(refunds)} refunded in USDC + Season 2 coins at their 3-month average price` : 'Loading prices…'}
            </p>
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
                · {ended ? `${formatMultiple(backOf(idea))} back` : `${formatMultiple(values[idea.slug].current)} now`}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
