import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { fetchProposalHistory, type ProposalHistory } from './proposalHistory'
import type { ProposalMarket } from './proposalMarket'

/** Price history of a proposal's markets; refreshed every minute while the market is open. */
export function useProposalHistory(proposal?: string, market?: ProposalMarket | null) {
  const { connection } = useConnection()
  const [history, setHistory] = useState<ProposalHistory | null>(null)
  const baseDecimals = market?.baseDecimals
  const quoteDecimals = market?.quoteDecimals
  const pending = market?.pending
  const dao = market?.dao.toBase58()

  useEffect(() => {
    if (!proposal || !dao || baseDecimals == null || quoteDecimals == null) return
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const load = (attempt = 0) => {
      fetchProposalHistory(connection.rpcEndpoint, proposal, dao, baseDecimals, quoteDecimals)
        .then((h) => {
          if (alive) setHistory(h)
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
  }, [connection, proposal, dao, baseDecimals, quoteDecimals, pending])

  return history
}
