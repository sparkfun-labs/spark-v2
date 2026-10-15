import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchPositions, fetchProposalMarket, type Positions, type ProposalMarket } from './proposalMarket'
import { usePolling } from './usePolling'

/** Pass/fail pools of a proposal and the connected wallet's positions, refreshed every 15s. */
export function useProposalMarket(dao?: string, proposal?: string) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [market, setMarket] = useState<ProposalMarket | null>(null)
  const [positions, setPositions] = useState<Positions | null>(null)

  const refresh = useCallback(async () => {
    if (!dao || !proposal) return
    try {
      const m = await fetchProposalMarket(connection, dao, proposal)
      setMarket(m)
      setPositions(publicKey ? await fetchPositions(connection, m, publicKey) : null)
    } catch (e) {
      console.warn('Could not load proposal market', e)
    }
  }, [connection, dao, proposal, publicKey])

  useEffect(() => {
    refresh()
  }, [refresh])
  // A decided proposal doesn't move any more: only open markets are refreshed, and only while the page is visible
  usePolling(refresh, !market || market.pending ? 15_000 : null)

  return { market, positions, refresh }
}
