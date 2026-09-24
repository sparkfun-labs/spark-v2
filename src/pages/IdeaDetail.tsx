import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { METADAO_DECISIONS, getIdea, ideaNumber, type Idea, type Proposal, type ProposalStatus } from '../data/ideas'
import { Countdown, IdeaAvatar, LaunchingSoon, StatusBadge, useLiveIdea } from '../components/IdeaCard'
import { FundModal } from '../components/FundModal'
import { TradePanel } from '../components/TradePanel'
import { PriceChart } from '../components/PriceChart'
import { useProposalMarket } from '../lib/useProposalMarket'
import { useProposalHistory } from '../lib/useProposalHistory'
import { useDaoProposals } from '../lib/useDaoProposals'
import type { OnchainProposal } from '../lib/daoProposals'
import { useCountdown } from '../lib/useCountdown'
import { ArrowRight, ArrowUpRight, Badge, Button, ChevronDown, Eyebrow, Glow, LiveDot, RaiseProgress, Sparkle, cx } from '../components/ui'
import type { ProposalMarket } from '../lib/proposalMarket'
import { LINKS, formatUsd } from '../lib/links'

export default function IdeaDetail() {
  const idea = getIdea(useParams().slug)

  if (!idea) {
    return (
      <div className="mx-auto max-w-[1072px] px-5 py-32 text-center">
        <h1 className="text-[32px] font-bold">Idea not found</h1>
        <Button to="/ideas" className="mt-8">
          Back to ideas
        </Button>
      </div>
    )
  }

  return <IdeaView idea={idea} />
}

/** What a proposal card needs, whether it comes from the chain or from the static data. */
type ProposalView = {
  key: string
  address: string
  id: string
  title: string
  status: ProposalStatus
  summary?: string
  items?: string[]
  teamSponsored?: boolean
  twap?: { pass: number; fail: number }
  volumeUsd?: number
  createdAt?: string
  endsAt?: string
  /** Full memo written on-chain, shown in the "Detail of the proposal" dropdown */
  memo?: string
  fullTextUrl?: string
  url: string
  onChain: boolean
}

const decisionId = (ticker: string, number: number) => `${ticker}-${String(number).padStart(3, '0')}`

function fromChain(p: OnchainProposal, known: Proposal | undefined, ticker: string): ProposalView {
  const slug = METADAO_DECISIONS[p.address] ?? p.address.slice(0, 8).toLowerCase()
  // Show the same id as MetaDAO when its slug is a readable one (LFOWN-004), else our own numbering
  const id = /^[a-z0-9]+-\d+$/.test(slug) ? slug.toUpperCase() : decisionId(ticker, p.number)
  return {
    key: p.address,
    address: p.address,
    id,
    // The memo is the title; manual data only fills in proposals created without one
    title: p.title ?? known?.title ?? `Proposal #${p.number}`,
    status: p.status,
    summary: known?.summary,
    items: known?.items,
    teamSponsored: p.teamSponsored,
    twap: known?.twap,
    volumeUsd: known?.volumeUsd,
    createdAt: p.enqueuedAt ?? known?.createdAt,
    memo: p.memo,
    endsAt: p.status === 'pending' ? p.endsAt : undefined,
    fullTextUrl: p.fullTextUrl,
    url: `https://metadao.fi/decisions/${slug}`,
    onChain: true,
  }
}

function fromData(p: Proposal): ProposalView {
  return { key: p.address, ...p, onChain: false }
}

function IdeaView({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false)
  const live = useLiveIdea(idea)
  const onchain = useDaoProposals(live.launch?.dao)
  const r = idea.result

  const known = new Map((idea.proposals ?? []).map((p) => [p.address, p]))
  // Proposals are read from the DAO on-chain; drafts are not live decision markets yet, so they are hidden
  const proposals: ProposalView[] = (
    onchain ? onchain.map((p) => fromChain(p, known.get(p.address), idea.ticker)) : (idea.proposals ?? []).map(fromData)
  ).filter((p) => p.status !== 'draft')

  return (
    <div className="relative isolate overflow-hidden">
      <Glow className="top-[-100px] right-[-100px] h-[500px] w-[500px]" />

      <div className="mx-auto max-w-[1072px] px-5 pt-10">
        <Link to="/ideas" className="text-sm font-medium text-muted transition hover:text-ink">
          ← All ideas
        </Link>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center gap-5">
              <IdeaAvatar idea={idea} className="h-20 w-20" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {ideaNumber(idea) && <span className="text-xs font-medium text-muted">Idea #{ideaNumber(idea)}</span>}
                  <StatusBadge idea={idea} status={live.status} />
                  <span className="text-xs font-medium text-muted">
                    Season {idea.season} · {idea.category}
                  </span>
                </div>
                <h1 className="mt-2 text-5xl leading-none font-bold md:text-6xl">${idea.ticker}</h1>
              </div>
            </div>
            <p className="mt-5 text-2xl font-bold">{idea.name}</p>
            <p className="mt-1 text-lg text-muted">{idea.tagline}</p>
            {idea.related && (
              <Link
                to={`/ideas/${idea.related.slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-3 py-1.5 text-sm font-medium text-brand-dark transition hover:bg-brand/10"
              >
                {idea.related.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {idea.about && (
              <section className="mt-12 flex flex-col gap-4">
                <Eyebrow>The idea</Eyebrow>
                {idea.about.map((p) => (
                  <p key={p} className="text-lg text-muted">
                    {p}
                  </p>
                ))}
              </section>
            )}

          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card/80 p-5 shadow-card backdrop-blur-xl">
              {(live.status === 'live' || live.status === 'ended') && <Countdown endsAt={live.endsAt} />}
              {live.status === 'upcoming' && !live.launch ? <LaunchingSoon /> : <RaiseProgress raised={live.raised} goal={live.goal} />}

              <dl className="divide-y divide-line text-sm">
                {r ? (
                  <>
                    <Line k="Launched with" v={formatUsd(r.launched)} />
                    <Line k="Performance" v={`${r.change > 0 ? '+' : ''}${r.change.toFixed(1)}%`} />
                    <Line k="Refunded to backers" v={formatUsd(r.refunded)} />
                    {r.winner ? (
                      <Line k="Winner" v={r.winner.name} />
                    ) : r.winners ? (
                      <Line k="Winning teams" v={String(r.winners)} />
                    ) : r.winners === 0 ? (
                      <Line k="Winner" v="No winner" />
                    ) : null}
                  </>
                ) : (
                  <>
                    {live.funders !== undefined && <Line k="Investors" v={String(live.funders)} />}
                    {idea.icoPrice && <Line k="Launch price" v={`$${idea.icoPrice}`} />}
                    {idea.fdv && <Line k="Implied FDV" v={idea.fdv} />}
                    {idea.supply && <Line k="Total supply" v={idea.supply} />}
                    {live.launch?.yourCommitted ? <Line k="Your commitment" v={formatUsd(live.launch.yourCommitted)} /> : null}
                    <Line k="Team allocation" v="0%" />
                  </>
                )}
              </dl>

              <div className="flex flex-col gap-3">
                {live.status === 'live' && (
                  <Button className="w-full" onClick={() => setOpen(true)}>
                    Fund ${idea.ticker} <ArrowRight />
                  </Button>
                )}
                {idea.futardioUrl && (
                  <Button variant="secondary" className="w-full" href={idea.futardioUrl}>
                    View on Futardio <ArrowUpRight />
                  </Button>
                )}
                {idea.legal && (
                  <Button variant="secondary" className="w-full" to={`/ideas/${idea.slug}/terms`}>
                    Legal terms
                  </Button>
                )}
                {idea.season === 1 && (
                  <Button variant="secondary" className="w-full" href={`${LINKS.sparkV1}ideas`}>
                    View on Spark v1 <ArrowUpRight />
                  </Button>
                )}
              </div>
              {live.onChain && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live data from Solana
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-3 rounded-2xl border border-line bg-surface p-5">
              <Sparkle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-bold">No winner, no spend</p>
                <p className="mt-1 text-muted">
                  Funds stay locked until a decision market approves a builder. If nobody convinces the market, backers get the
                  treasury back.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-line pb-4">
            <div className="flex flex-col gap-2">
              <Eyebrow>Decided by futarchy</Eyebrow>
              <h2 className="text-[32px] leading-tight font-bold">Proposals</h2>
            </div>
            {onchain && (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live from Solana
              </span>
            )}
          </div>
          {proposals.length ? (
            <div className="mt-6 flex flex-col gap-4">
              {proposals
                .filter((p) => p.status === 'pending')
                .map((p) => (
                  <ProposalCard key={p.key} p={p} dao={live.launch?.dao} ticker={idea.ticker} />
                ))}
              {proposals.some((p) => p.status !== 'pending') && (
                <p className="mt-4 text-xs font-medium text-muted uppercase">Past proposals</p>
              )}
              {proposals
                .filter((p) => p.status !== 'pending')
                .map((p) => (
                  <ProposalCard key={p.key} p={p} dao={live.launch?.dao} ticker={idea.ticker} collapsible />
                ))}
            </div>
          ) : (
            <p className="mt-6 text-muted">
              {idea.season === 1
                ? 'This idea ran on Spark v1. Its hackathon and decision were handled there.'
                : !live.launch?.dao && (live.status === 'live' || live.status === 'ended')
                  ? 'Proposals open once the raise completes and the DAO is created on-chain.'
                  : 'No live proposals yet. Builders can pitch through the Spark Telegram.'}
            </p>
          )}
        </section>
      </div>

      {open && <FundModal idea={idea} launch={live.launch} onClose={() => setOpen(false)} onFunded={live.refresh} />}
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono text-xs">{v}</dd>
    </div>
  )
}

const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: 'brand' | 'neutral' | 'success' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'Market open', tone: 'brand' },
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'neutral' },
  removed: { label: 'Removed', tone: 'neutral' },
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function MarketCloses({ endsAt }: { endsAt: string }) {
  const c = useCountdown(endsAt)
  if (!c) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3 text-sm">
      <span className="font-medium text-muted">{c.done ? 'Market closed, awaiting finalization' : 'Market closes in'}</span>
      {!c.done && (
        <span className="font-mono text-ink tabular-nums">
          {c.d > 0 && `${c.d}d `}
          {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
        </span>
      )}
    </div>
  )
}

/** The TWAP only counts after the start delay; once it does, show how pass compares with fail against the threshold. */
function TwapStatus({ twap }: { twap: NonNullable<ProposalMarket['twap']> }) {
  const c = useCountdown(new Date(twap.startsAt).toISOString())
  if (!c) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  const needs = twap.thresholdBps / 100
  const delta = twap.pass && twap.fail ? (twap.pass / twap.fail - 1) * 100 : undefined
  const box = 'flex items-center justify-between gap-3 rounded-xl bg-brand/5 px-4 py-3 text-sm'

  if (!c.done) {
    return (
      <div className={box}>
        <span className="font-medium text-muted">TWAP starts in</span>
        <span className="font-mono text-ink tabular-nums">
          {c.d > 0 && `${c.d}d `}
          {pad(c.h)}:{pad(c.m)}:{pad(c.s)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={box}
      title={twap.pass && twap.fail ? `Pass TWAP $${twap.pass.toPrecision(4)} · Fail TWAP $${twap.fail.toPrecision(4)}` : undefined}
    >
      <span className="flex items-center gap-2 font-medium text-muted">
        <LiveDot /> TWAP active
      </span>
      {delta == null ? (
        <span className="text-xs text-muted">Waiting for the next trade</span>
      ) : (
        <span className={cx('font-mono text-xs tabular-nums', delta > needs ? 'text-success' : 'text-error')}>
          {delta > 0 ? '+' : ''}
          {delta.toFixed(2)}% · needs {needs > 0 ? '+' : ''}
          {needs}%
        </span>
      )}
    </div>
  )
}

function ProposalCard({ p, dao, ticker, collapsible }: { p: ProposalView; dao?: string; ticker: string; collapsible?: boolean }) {
  const badge = PROPOSAL_STATUS[p.status]
  const [open, setOpen] = useState(!collapsible)
  const statusBadge = (
    <Badge tone={badge.tone} dot={p.status === 'pending'}>
      {badge.label}
    </Badge>
  )

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      {collapsible ? (
        <button className="flex w-full items-center gap-4 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="shrink-0 font-mono text-xs text-muted">{p.id}</span>
            <span className="min-w-0 flex-1 truncate text-lg font-bold">{p.title}</span>
          </div>
          {statusBadge}
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-muted transition duration-300', open && 'rotate-180')} />
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">{p.id}</span>
            {p.teamSponsored && <Badge>Team sponsored</Badge>}
          </div>
          {statusBadge}
        </div>
      )}

      {/* Past proposals only load their market and chart once opened */}
      {open && (
        <div className="mt-4">
          <ProposalBody p={p} dao={dao} ticker={ticker} showTitle={!collapsible} />
        </div>
      )}
    </div>
  )
}

function ProposalBody({ p, dao, ticker, showTitle }: { p: ProposalView; dao?: string; ticker: string; showTitle: boolean }) {
  const onChain = p.onChain && !!dao
  const state = useProposalMarket(onChain ? dao : undefined, onChain ? p.address : undefined)
  const history = useProposalHistory(onChain ? p.address : undefined, state.market)
  const { market, positions } = state

  // Open markets are tradable by anyone; finalized ones only matter to wallets that still hold pass/fail tokens
  const holds = !!positions && [positions.passQuote, positions.failQuote, positions.passBase, positions.failBase].some((v) => v > 0)
  const showTrade = !!market && (market.pending || holds)

  // Live markets extend to now with the current pool prices
  const points =
    history && market?.pending && market.pools.pass && market.pools.fail
      ? [...history.points, { t: Date.now(), pass: market.pools.pass.price, fail: market.pools.fail.price, spot: market.pools.spot.price }]
      : (history?.points ?? [])
  const chartEnd = history?.finalizedAt ?? (market?.pending ? Date.now() : (points[points.length - 1]?.t ?? 0))

  return (
    <>
      <div className={cx('grid gap-5', showTrade && 'lg:grid-cols-[minmax(0,1fr)_440px]')}>
        <div className="flex min-w-0 flex-col gap-4">
          {showTitle && <h3 className="text-2xl leading-tight font-bold">{p.title}</h3>}
          {p.summary && <p className="text-muted">{p.summary}</p>}
          {p.items && (
            <ul className="flex flex-col gap-3">
              {p.items.map((i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <Sparkle className="mt-1 h-3 w-3 shrink-0 text-brand" />
                  {i}
                </li>
              ))}
            </ul>
          )}

          {(p.endsAt || market?.twap) && (
            <div className={cx('grid gap-2', p.endsAt && market?.twap && 'sm:grid-cols-2')}>
              {p.endsAt && <MarketCloses endsAt={p.endsAt} />}
              {market?.twap && <TwapStatus twap={market.twap} />}
            </div>
          )}

          {points.length > 0 ? (
            <PriceChart points={points} end={chartEnd} live={!!market?.pending} marker={market?.twap && { t: market.twap.startsAt, label: 'TWAP' }} />
          ) : (
            onChain && !history && <div className="h-[330px] animate-pulse rounded-xl bg-surface" />
          )}

          {p.twap && (
            <div className="grid grid-cols-3 gap-3">
              <MarketStat label="Pass TWAP" value={`$${p.twap.pass.toFixed(6)}`} className={p.status === 'passed' ? 'text-success' : undefined} />
              <MarketStat label="Fail TWAP" value={`$${p.twap.fail.toFixed(6)}`} className={p.status === 'failed' ? 'text-error' : undefined} />
              <MarketStat label="Volume" value={formatUsd(p.volumeUsd ?? 0)} />
            </div>
          )}
        </div>

        {showTrade && (
          <div className="flex">
            <TradePanel state={state} proposal={p.address} ticker={ticker} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {p.createdAt && <>Opened {formatDate(p.createdAt)}</>}
          {p.onChain && (
            <>
              {p.createdAt && ' · '}
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> on-chain
            </>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          {p.fullTextUrl && (
            <Button variant="secondary" size="sm" href={p.fullTextUrl}>
              Detail of the proposal <ArrowUpRight />
            </Button>
          )}
          <Button variant="secondary" size="sm" href={p.url}>
            View on MetaDAO <ArrowUpRight />
          </Button>
        </div>
      </div>
    </>
  )
}

function MarketStat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-3">
      <span className="text-xs font-medium text-muted uppercase">{label}</span>
      <span className={cx('font-mono text-xs', className)}>{value}</span>
    </div>
  )
}
