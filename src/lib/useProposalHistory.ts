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

  useEffect(() => {
    if (!proposal || baseDecimals == null || quoteDecimals == null) return
    let alive = true
    const load = () => {
      fetchProposalHistory(connection.rpcEndpoint, proposal, baseDecimals, quoteDecimals)
        .then((h) => {
          if (alive) setHistory(h)
        })
        .catch((e) => console.warn('Could not load proposal history', e))
    }
    load()
    const timer = pending ? setInterval(load, 60_000) : undefined
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [connection, proposal, baseDecimals, quoteDecimals, pending])

  return history
}
