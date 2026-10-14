import { useEffect, useMemo, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { cachedProposalHistory, fetchProposalHistory, type MarketWindow, type ProposalHistory } from './proposalHistory'

/**
 * Price history of a proposal's markets; refreshed every minute while the market is open.
 * Loading starts as soon as the proposal is known (it doesn't wait for the market), a previous visit's history shows
 * right away, and prices are scaled once the token decimals are known.
 */
export function useProposalHistory(
  proposal: string | undefined,
  dao: string | undefined,
  window: MarketWindow | undefined,
  decimals: { base: number; quote: number } | undefined,
  pending: boolean,
) {
  const { connection } = useConnection()
  const [raw, setRaw] = useState<ProposalHistory | null>(() => (proposal ? cachedProposalHistory(proposal) : null))
  // Decimals seen on a previous visit, so the chart doesn't wait for the market to load
  const known = useMemo(() => {
    if (decimals || !proposal) return decimals
    try {
      const saved = localStorage.getItem(`spark:proposal-decimals:${proposal}`)
      return saved ? (JSON.parse(saved) as { base: number; quote: number }) : undefined
    } catch {
      return undefined
    }
  }, [decimals, proposal])
  useEffect(() => {
    if (!decimals || !proposal) return
    try {
      localStorage.setItem(`spark:proposal-decimals:${proposal}`, JSON.stringify(decimals))
    } catch {
      // Storage unavailable: the chart waits for the market next time
    }
  }, [decimals, proposal])
  const from = window?.from
  const to = window?.to

  useEffect(() => {
    if (!proposal || !dao || from == null) return
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const load = (attempt = 0) => {
      fetchProposalHistory(connection.rpcEndpoint, proposal, dao, { from, to })
        .then((h) => {
          if (alive) setRaw(h)
        })
        .catch((e) => {
          console.warn('Could not load proposal history', e)
          // Usually the RPC rate limit: try again shortly instead of leaving the chart empty
          if (alive && attempt < 4) retry = setTimeout(() => load(attempt + 1), 5_000 * 2 ** attempt)
        })
    }
    load()
    const timer = pending ? setInterval(() => load(), 60_000) : undefined
    return () => {
      alive = false
      clearInterval(timer)
      clearTimeout(retry)
    }
  }, [connection, proposal, dao, from, to, pending])

  return useMemo(() => {
    if (!raw || !known) return null
    const scale = 10 ** (known.base - known.quote)
    return {
      finalizedAt: raw.finalizedAt,
      points: raw.points.map((p) => ({ t: p.t, pass: p.pass * scale, fail: p.fail * scale, spot: p.spot * scale })),
    }
  }, [raw, known])
}
