import { useState } from 'react'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { describeError } from '../lib/futardio'
import { quoteSwap, tradeProposal, withdrawPositions, type Side, type SwapType } from '../lib/proposalMarket'
import type { useProposalMarket } from '../lib/useProposalMarket'
import { ArrowUpRight, Button, cx } from './ui'

const formatPrice = (n: number) => `$${n < 0.01 ? n.toPrecision(3) : n.toFixed(4)}`
const formatAmount = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : 2 })
const SLIPPAGE_BPS = 200

/** Buy or sell a proposal's pass / fail market, straight against the MetaDAO futarchy AMM. */
export function TradePanel({
  state,
  proposal,
  ticker,
}: {
  /** Loaded once by the proposal card and shared with its chart */
  state: ReturnType<typeof useProposalMarket>
  proposal: string
  ticker: string
}) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const wallet = useAnchorWallet()
  const { setVisible } = useWalletModal()
  const { market, positions, refresh } = state
  const [side, setSide] = useState<Side>('pass')
  const [swapType, setSwapType] = useState<SwapType>('buy')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState<'trade' | 'withdraw' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  if (!market) {
    return <div className="h-24 animate-pulse rounded-xl bg-surface" />
  }

  const pass = market.pools.pass?.price ?? 0
  const fail = market.pools.fail?.price ?? 0
  const delta = fail > 0 ? (pass / fail - 1) * 100 : 0

  const payUnit = swapType === 'buy' ? 'USDC' : `$${ticker}`
  const getUnit = swapType === 'buy' ? `$${ticker}` : 'USDC'
  const conditional = side === 'pass' ? 'Pass' : 'Fail'
  const available = positions
    ? swapType === 'buy'
      ? positions.quote + (side === 'pass' ? positions.passQuote : positions.failQuote)
      : positions.base + (side === 'pass' ? positions.passBase : positions.failBase)
    : null
  const quote = quoteSwap(market, side, swapType, amount)
  const hasPositions = !!positions && [positions.passQuote, positions.failQuote, positions.passBase, positions.failBase].some((v) => v > 0)

  const run = async (kind: 'trade' | 'withdraw') => {
    setError(null)
    setSignature(null)
    if (!wallet) return setVisible(true)
    setBusy(kind)
    try {
      const sig =
        kind === 'trade'
          ? await tradeProposal({ connection, wallet, market, side, swapType, amount, slippageBps: SLIPPAGE_BPS })
          : await withdrawPositions({ connection, wallet, market })
      setSignature(sig)
      if (kind === 'trade') setAmount('')
      refresh()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(null)
    }
  }

  // Finalized proposals: only show what the wallet can still redeem
  if (!market.pending) {
    if (!hasPositions) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
        <Holdings positions={positions!} ticker={ticker} />
        <Button size="sm" onClick={() => run('withdraw')} disabled={!!busy || !market.resolved}>
          {busy ? 'Confirm in your wallet…' : market.resolved ? 'Redeem' : 'Awaiting finalization'}
        </Button>
        {error && <p className="w-full text-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PriceTile label="Pass price" value={formatPrice(pass)} className="text-success" />
        <PriceTile label="Fail price" value={formatPrice(fail)} className="text-error" />
        <PriceTile label="Spot price" value={formatPrice(market.pools.spot.price)} />
        <PriceTile
          label="Pass vs fail"
          value={`${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`}
          className={delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Segmented
          value={side}
          onChange={setSide}
          options={[
            ['pass', 'Pass', 'bg-success text-white'],
            ['fail', 'Fail', 'bg-error text-white'],
          ]}
        />
        <Segmented
          value={swapType}
          onChange={setSwapType}
          options={[
            ['buy', 'Buy', 'bg-ink text-bg'],
            ['sell', 'Sell', 'bg-ink text-bg'],
          ]}
        />
      </div>

      <div className="rounded-xl border border-line bg-card p-3 focus-within:border-brand">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <label htmlFor={`amount-${proposal}`}>You pay</label>
          {available !== null && (
            <button className="hover:text-ink" onClick={() => setAmount(String(Math.floor(available * 1e6) / 1e6))}>
              Available {formatAmount(available)} · <span className="text-brand">Max</span>
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <input
            id={`amount-${proposal}`}
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-full bg-transparent text-2xl font-bold tabular-nums outline-none"
          />
          <span className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-xs">{payUnit}</span>
        </div>
      </div>

      {quote && (
        <dl className="space-y-2 text-sm">
          <Row k="You receive (est.)" v={`${formatAmount(quote.outUi)} ${conditional.toLowerCase()} ${getUnit}`} />
          <Row k="Average price" v={formatPrice(quote.avgPrice)} />
          <Row k="Price impact" v={`${(quote.impact * 100).toFixed(2)}%`} warn={quote.impact > 0.05} />
          <Row k="Max slippage" v={`${SLIPPAGE_BPS / 100}%`} />
        </dl>
      )}

      {/* Pinned to the bottom so the panel lines up with the bottom of the chart */}
      <div className="mt-auto flex flex-col gap-4">
      {error && <p className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">{error}</p>}
      {signature && (
        <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-medium text-success">
          Trade confirmed, view transaction <ArrowUpRight />
        </a>
      )}

      <Button className="w-full" onClick={() => run('trade')} disabled={!!busy || (!!publicKey && !quote)}>
        {!publicKey
          ? 'Connect wallet to trade'
          : busy === 'trade'
            ? 'Confirm in your wallet…'
            : `${swapType === 'buy' ? 'Buy' : 'Sell'} ${conditional} $${ticker}`}
      </Button>

      {hasPositions && (
        <div className="border-t border-line pt-4 text-sm">
          <Holdings positions={positions!} ticker={ticker} />
        </div>
      )}

      <p className="text-xs text-muted">
        {swapType === 'buy' ? 'USDC' : `$${ticker}`} is split into pass and fail tokens, then traded on the {conditional.toLowerCase()} market. The losing
        side is worth nothing once the proposal is decided. Not financial advice.
      </p>
      </div>
    </div>
  )
}

function Holdings({ positions: p, ticker }: { positions: NonNullable<ReturnType<typeof useProposalMarket>['positions']>; ticker: string }) {
  const parts = [
    [p.passBase, `pass $${ticker}`],
    [p.failBase, `fail $${ticker}`],
    [p.passQuote, 'pass USDC'],
    [p.failQuote, 'fail USDC'],
  ].filter(([v]) => (v as number) > 0) as [number, string][]
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase">Your position</p>
      <p className="mt-1 font-mono text-xs">{parts.map(([v, label]) => `${formatAmount(v)} ${label}`).join(' · ')}</p>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: [T, string, string][]
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-card p-1">
      {options.map(([v, label, active]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cx('rounded-lg py-1.5 text-sm font-bold transition', value === v ? active : 'text-muted hover:text-ink')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PriceTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-3">
      <span className="text-[11px] font-medium text-muted uppercase">{label}</span>
      <span className={cx('font-mono text-sm', className)}>{value}</span>
    </div>
  )
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className={cx('font-mono text-xs', warn && 'text-error')}>{v}</dd>
    </div>
  )
}
