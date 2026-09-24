import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import type { Idea } from '../data/ideas'
import { formatUsd, shortAddress } from '../lib/links'
import { describeError, fundLaunch, getQuoteBalance, type LaunchSnapshot } from '../lib/futardio'
import { ArrowUpRight, Badge, Button, cx } from './ui'

const PRESETS = ['50', '250', '1000']

export function FundModal({
  idea,
  launch,
  onClose,
  onFunded,
}: {
  idea: Idea
  launch: LaunchSnapshot | null
  onClose: () => void
  onFunded?: () => void
}) {
  const { publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [amount, setAmount] = useState('250')
  const [balance, setBalance] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    if (!publicKey || !launch) return
    getQuoteBalance(connection, launch.quoteMint, publicKey).then(setBalance)
  }, [connection, publicKey, launch, signature])

  const value = Number(amount) || 0
  const tokens = idea.icoPrice ? value / idea.icoPrice : 0
  const canFund = !!idea.launchAddress && (!launch || launch.state === 'live')

  const submit = async () => {
    setError(null)
    if (!anchorWallet) return setVisible(true)
    if (!idea.launchAddress) return
    setBusy(true)
    try {
      const sig = await fundLaunch({ connection, wallet: anchorWallet, launchAddress: idea.launchAddress, amount })
      setSignature(sig)
      onFunded?.()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="rise w-full max-w-[420px] rounded-t-2xl border border-line bg-card p-6 shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-brand uppercase">Fund on Futardio</p>
            <h3 className="mt-1 text-2xl font-bold">${idea.ticker}</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-surface-hover text-muted hover:text-ink" aria-label="Close">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        {signature ? (
          <div className="mt-6 text-center">
            <div className="bg-brand-gradient mx-auto grid h-12 w-12 place-items-center rounded-full text-white">
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 10.5 3 3 7-7" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-bold">You’re in</p>
            <p className="mt-1 text-sm text-muted">
              {formatUsd(value)} committed to ${idea.ticker}. Tokens become claimable once the raise completes.
            </p>
            <Button variant="secondary" className="mt-6 w-full" href={`https://solscan.io/tx/${signature}`}>
              View transaction <ArrowUpRight />
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-line bg-surface p-4 focus-within:border-brand">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <label htmlFor="amount">You pay</label>
                {balance !== null && (
                  <button className="hover:text-ink" onClick={() => setAmount(String(balance))}>
                    Balance {formatUsd(balance)} · <span className="text-brand">Max</span>
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full bg-transparent text-3xl font-bold tabular-nums outline-none"
                />
                <span className="rounded-full border border-line bg-card px-2.5 py-1 font-mono text-xs">USDC</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={cx(
                    'rounded-full border px-3 py-1 font-mono text-xs transition',
                    amount === p ? 'border-brand bg-brand/10 text-brand-dark' : 'border-line text-muted hover:text-ink',
                  )}
                >
                  ${p}
                </button>
              ))}
            </div>

            <dl className="mt-5 space-y-2.5 text-sm">
              <Row k="You receive (est.)" v={`${tokens.toLocaleString('en-US')} $${idea.ticker}`} />
              <Row k="Price" v={idea.icoPrice ? `$${idea.icoPrice}` : '—'} />
              {launch?.yourCommitted ? <Row k="Already committed" v={formatUsd(launch.yourCommitted)} /> : null}
              <Row k="Wallet" v={publicKey ? shortAddress(publicKey.toBase58()) : 'Not connected'} />
            </dl>

            {launch && launch.state !== 'live' && (
              <div className="mt-4">
                <Badge>Raise is {launch.state}</Badge>
              </div>
            )}
            {error && <p className="mt-4 rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">{error}</p>}

            <Button size="lg" className="mt-6 w-full" onClick={submit} disabled={busy || !canFund || (!!publicKey && value <= 0)}>
              {!publicKey ? 'Connect wallet' : busy ? 'Confirm in your wallet…' : `Fund ${formatUsd(value)}`}
            </Button>
            <p className="mt-3 text-center text-xs text-muted">
              Signs a fund transaction on the MetaDAO launchpad. If no builder wins, backers get the treasury back. Not
              financial advice.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono text-xs">{v}</dd>
    </div>
  )
}
