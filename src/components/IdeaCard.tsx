import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ideaNumber, type Idea, type IdeaStatus } from '../data/ideas'
import type { LaunchSnapshot } from '../lib/futardio'
import { formatUsd } from '../lib/links'
import { useCountdown } from '../lib/useCountdown'
import { useLaunch } from '../lib/useLaunch'
import { useTokenMarket } from '../lib/useTokenMarket'
import { useDaoProposals } from '../lib/useDaoProposals'
import { FundModal } from './FundModal'
import { LogoMark } from './Logo'
import { ArrowRight, ArrowUpRight, Badge, Button, LiveDot, Pill, ProgressBar, Sparkle, StatTile, cx } from './ui'

/**
 * A raise is only "live" while the launch account says so and its end time has not passed.
 * Launch states: initialized → live → closed (ended, not settled) → complete (DAO created) or refunding.
 */
export function effectiveStatus(idea: Idea, launch: LaunchSnapshot | null): IdeaStatus {
  if (idea.status !== 'live') return idea.status
  switch (launch?.state) {
    case 'initialized':
      return 'upcoming'
    case 'complete':
      return 'building'
    case 'refunding':
      return 'closed'
    case 'closed':
      return 'ended'
  }
  const endsAt = launch?.endsAt ?? idea.endsAt
  return endsAt && Date.parse(endsAt) <= Date.now() ? 'ended' : 'live'
}

/** Merges static idea data with live on-chain launch data when available. */
export function useLiveIdea(idea: Idea) {
  const { data, refresh } = useLaunch(idea.launchAddress)
  const raised = data?.totalCommitted ?? idea.raised
  const goal = data?.minimumRaise || idea.goal
  return {
    launch: data,
    status: effectiveStatus(idea, data),
    refresh,
    raised,
    goal,
    pct: goal > 0 ? (raised / goal) * 100 : 0,
    endsAt: data?.endsAt ?? idea.endsAt,
    funders: data?.funders ?? idea.funders,
    onChain: !!data,
  }
}

export function StatusBadge({ idea, status = idea.status }: { idea: Idea; status?: IdeaStatus }) {
  switch (status) {
    case 'live':
      return (
        <Badge tone="brand" dot>
          Live
        </Badge>
      )
    case 'hackathon':
      return (
        <Badge tone="brand" dot>
          Hackathon
        </Badge>
      )
    case 'building':
      return <Badge tone="brand">Builders wanted</Badge>
    case 'upcoming':
      return <Badge>Soon</Badge>
    case 'ended':
      return <Badge>Raise ended</Badge>
    default:
      return <Badge>Closed</Badge>
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function Countdown({ endsAt, className }: { endsAt?: string; className?: string }) {
  const c = useCountdown(endsAt)
  if (!c) return null
  if (c.done) return <span className={cx('text-xs font-medium text-muted', className)}>Raise ended</span>
  return (
    <span className={cx('text-xs font-medium text-muted', className)}>
      Ends in{' '}
      <span className="font-mono text-ink tabular-nums">
        {c.d > 0 && `${c.d}d `}
        {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
      </span>
    </span>
  )
}

function TimeLeft({ endsAt }: { endsAt?: string }) {
  const c = useCountdown(endsAt)
  if (!c) return <>—</>
  if (c.done) return <>Ended</>
  return <>{c.d > 0 ? `${c.d}d ${c.h}h` : c.h > 0 ? `${c.h}h ${pad(c.m)}m` : `${c.m}m`}</>
}

const formatPrice = (n?: number) => (n == null ? '—' : `$${n < 0.01 ? n.toPrecision(3) : n.toFixed(4)}`)

/** Square idea artwork; falls back to a Spark tile for ideas without an image. */
function IdeaArt({ idea, className }: { idea: Idea; className?: string }) {
  if (idea.image) return <img src={idea.image} alt="" className={cx('object-cover', className)} loading="lazy" />
  return (
    <div className={cx('flex flex-col items-center justify-center gap-3 bg-art', className)}>
      <LogoMark className="h-1/4 w-1/4" />
      <span className="text-2xl font-black tracking-tight text-ink/80">${idea.ticker}</span>
    </div>
  )
}

export function IdeaAvatar({ idea, className = 'h-20 w-20' }: { idea: Idea; className?: string }) {
  return (
    <div className={cx('shrink-0 overflow-hidden rounded-full ring-1 ring-line', className)}>
      {idea.image ? (
        <img src={idea.image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-brand/10">
          <LogoMark className="h-3/5 w-3/5" />
        </div>
      )}
    </div>
  )
}

/** HeroIdeaCard from the design: compact live idea summary with a primary action. */
export function HeroIdeaCard({ idea, className }: { idea: Idea; className?: string }) {
  const [open, setOpen] = useState(false)
  const live = useLiveIdea(idea)

  return (
    <>
      <div className={cx('flex w-full flex-col items-center gap-4 rounded-2xl border border-line bg-card/80 p-5 shadow-card backdrop-blur-xl', className)}>
        <div className="flex w-full items-center justify-between">
          <span className="text-xs font-medium text-muted">Idea #{ideaNumber(idea)}</span>
          <StatusBadge idea={idea} status={live.status} />
        </div>
        <IdeaAvatar idea={idea} />
        <Link to={`/ideas/${idea.slug}`} className="w-60 text-center text-lg leading-tight font-bold hover:text-brand-dark">
          ${idea.ticker} - {idea.name}
        </Link>
        <div className="flex w-full items-center justify-between text-xs font-medium">
          <span className="text-muted">Progress</span>
          <span className="text-brand">{live.pct.toFixed(1)}%</span>
        </div>
        <ProgressBar pct={live.pct} className="w-full" />
        <div className="grid w-full grid-cols-3 gap-2">
          <StatTile label="Raised" value={formatUsd(live.raised, true)} />
          <StatTile label="Investors" value={live.funders ?? '—'} />
          <StatTile label="Left" value={<TimeLeft endsAt={live.endsAt} />} />
        </div>
        {live.status === 'live' ? (
          <Button variant="solid" className="w-full" onClick={() => setOpen(true)}>
            Fund this idea <ArrowRight />
          </Button>
        ) : (
          <Button variant="solid" className="w-full" to={`/ideas/${idea.slug}`}>
            {live.launch?.dao ? 'Trade proposals' : 'View idea'} <ArrowRight />
          </Button>
        )}
        {live.onChain && (
          <p className="-mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live data from Solana
          </p>
        )}
      </div>
      {open && <FundModal idea={idea} launch={live.launch} onClose={() => setOpen(false)} onFunded={live.refresh} />}
    </>
  )
}

/** IdeaCard/Desktop from the design: artwork, name and funding progress. */
export function IdeaTile({
  idea,
  className,
  link = true,
  tabIndex,
  staticProgress,
}: {
  idea: Idea
  className?: string
  link?: boolean
  tabIndex?: number
  /** Show the progress bar filled right away (used inside the moving marquee) */
  staticProgress?: boolean
}) {
  const live = useLiveIdea(idea)
  const body = (
    <div className={cx('group overflow-hidden rounded-2xl border border-line bg-card shadow-card transition duration-300', link && 'hover:-translate-y-1', className)}>
      <IdeaArt idea={idea} className="aspect-square w-full transition duration-500 group-hover:scale-[1.03]" />
      <div className="relative bg-card">
        <p className="truncate p-4 pb-2 text-sm font-medium">
          ${idea.ticker} - {idea.name}
        </p>
        <div className="px-4 py-2">
          <ProgressBar pct={live.pct} animate={!staticProgress} />
        </div>
        <div className="flex items-center justify-between px-4 pt-2 pb-4 text-xs">
          <span className="font-medium text-brand">{live.pct.toFixed(1)}%</span>
          <span className="font-mono text-muted">
            {formatUsd(live.raised)}/{formatUsd(live.goal)}
          </span>
        </div>
      </div>
    </div>
  )
  return link ? (
    <Link to={`/ideas/${idea.slug}`} className="block" tabIndex={tabIndex}>
      {body}
    </Link>
  ) : (
    body
  )
}

/** Shown instead of raise numbers while an idea waits for its Futardio launch. */
export function LaunchingSoon({ className }: { className?: string }) {
  return (
    <div className={cx('flex flex-col gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-5', className)}>
      <span className="flex items-center gap-2 text-sm font-bold">
        <LiveDot /> Launching soon on Futardio
      </span>
      <p className="text-sm text-muted">The raise opens on Futardio. Same price for everyone, no team allocation.</p>
    </div>
  )
}

/** Season 2 idea card on the Ideas page (two per row). */
export function LiveIdeaCard({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false)
  const live = useLiveIdea(idea)
  const market = useTokenMarket(idea.mint)
  const openProposals = (useDaoProposals(live.launch?.dao) ?? []).filter((p) => p.status === 'pending')

  return (
    <>
      <div className="flex h-full flex-col gap-5 rounded-2xl border border-line bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <IdeaAvatar idea={idea} className="h-14 w-14" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted">Idea #{ideaNumber(idea)}</span>
              <StatusBadge idea={idea} status={live.status} />
            </div>
            <h3 className="mt-1 truncate text-xl font-bold">
              ${idea.ticker} - {idea.name}
            </h3>
          </div>
        </div>
        <p className="text-sm text-muted">{idea.tagline}</p>

        {live.status === 'upcoming' && !live.launch ? (
          <LaunchingSoon />
        ) : (
          <>
        <div>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted">Progress</span>
            <span className="text-brand">{live.pct.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={live.pct} className="mt-2" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted">
              {formatUsd(live.raised)}/{formatUsd(live.goal)}
            </span>
            <Countdown endsAt={live.endsAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatTile label="Raised" value={formatUsd(live.raised, true)} />
          <StatTile label="Investors" value={live.funders ?? '—'} />
          <StatTile
            label={market || idea.token?.price != null ? 'Price' : 'ICO price'}
            value={formatPrice(market?.price ?? idea.token?.price ?? idea.icoPrice)}
          />
          <StatTile label="ATH" value={formatPrice(Math.max(market?.ath ?? 0, idea.token?.ath ?? 0) || undefined)} />
          <StatTile label="Left" value={<TimeLeft endsAt={live.endsAt} />} />
        </div>
          </>
        )}

        {openProposals.length > 0 && (
          <Link
            to={`/ideas/${idea.slug}`}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm transition hover:bg-brand/10"
          >
            <span className="flex shrink-0 items-center gap-2 font-medium">
              <LiveDot /> {openProposals.length} live proposal{openProposals.length > 1 ? 's' : ''}
            </span>
            <span className="truncate text-muted">{openProposals[0].title}</span>
          </Link>
        )}

        <div className="mt-auto flex flex-wrap gap-3">
          {live.status === 'live' ? (
            <Button onClick={() => setOpen(true)}>
              Fund this idea <ArrowRight />
            </Button>
          ) : (
            <Button to={`/ideas/${idea.slug}`}>
              View idea <ArrowRight />
            </Button>
          )}
          {idea.futardioUrl && (
            <Button variant="secondary" href={idea.futardioUrl}>
              View on Futardio <ArrowUpRight />
            </Button>
          )}
        </div>
      </div>
      {open && <FundModal idea={idea} launch={live.launch} onClose={() => setOpen(false)} onFunded={live.refresh} />}
    </>
  )
}

/** Season 1 result card: same layout for every idea, with "—" where an idea has no data. */
export function SeasonOneCard({ idea }: { idea: Idea }) {
  const r = idea.result
  const market = useTokenMarket(idea.mint)
  const pct = idea.goal > 0 ? (idea.raised / idea.goal) * 100 : 0
  const change = r?.change ?? 0
  const changeTone = !r || change === 0 ? 'text-muted' : change < 0 ? 'text-error' : 'text-success'
  const ath = Math.max(market?.ath ?? 0, idea.token?.ath ?? 0) || undefined

  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-line bg-card p-5 shadow-card transition duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <IdeaAvatar idea={idea} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <Link to={`/ideas/${idea.slug}`} className="block truncate font-bold hover:text-brand-dark">
            ${idea.ticker}
          </Link>
          <p className="truncate text-xs text-muted">{idea.name}</p>
        </div>
        <StatusBadge idea={idea} />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-muted uppercase">Committed</span>
          <span className="text-brand">{pct.toFixed(0)}%</span>
        </div>
        <ProgressBar pct={pct} className="mt-2" />
        <p className="mt-2 font-mono text-xs text-muted">
          {formatUsd(idea.raised)}/{formatUsd(idea.goal)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
        <SeasonOneStat label="Treasury launch" value={r ? formatUsd(r.launched) : '—'} />
        <SeasonOneStat
          label="Treasury end"
          value={r ? formatUsd(r.refunded) : '—'}
          note={r ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : undefined}
          noteClassName={changeTone}
        />
        <SeasonOneStat label="Token price" value={formatPrice(market?.price ?? idea.token?.price)} />
        <SeasonOneStat label="ATH" value={formatPrice(ath)} />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Pill>{idea.category}</Pill>
          {r?.winner ? (
            <WinnerPill name={r.winner.name} url={r.winner.url} />
          ) : r?.winners ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-dark">
              <Sparkle className="h-3 w-3" />
              {r.winners} winner{r.winners > 1 ? 's' : ''}
            </span>
          ) : null}
          {idea.links?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted transition hover:text-ink"
            >
              {l.label} <ArrowUpRight className="h-3 w-3" />
            </a>
          ))}
        </div>
        <Link to={`/ideas/${idea.slug}`} className="shrink-0 text-xs font-bold text-brand transition hover:text-brand-dark">
          View idea →
        </Link>
      </div>
    </div>
  )
}

/** The winning builder, linked to their profile when we have one. */
function WinnerPill({ name, url }: { name: string; url?: string }) {
  const content = (
    <>
      <Sparkle className="h-3 w-3" />
      {name}
      {url && <ArrowUpRight className="h-3 w-3" />}
    </>
  )
  const className = 'inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-dark'
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className={cx(className, 'transition hover:bg-brand/20')}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  )
}

function SeasonOneStat({ label, value, note, noteClassName }: { label: string; value: string; note?: string; noteClassName?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium text-muted uppercase">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className="font-mono text-sm">{value}</span>
        {note && <span className={cx('font-mono text-[11px]', noteClassName)}>{note}</span>}
      </dd>
    </div>
  )
}
