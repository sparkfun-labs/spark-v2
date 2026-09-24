import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import type { ProposalStatus } from '../data/ideas'

// Futarchy v0.6 Proposal account: discriminator (8) + number u32 (4) + proposer (32) + timestamp_enqueued i64 (8),
// then the ProposalState enum, whose first byte is the variant.
const STATE_OFFSET = 52
const STATES: ProposalStatus[] = ['draft', 'pending', 'passed', 'failed', 'removed']

/** Live status of a MetaDAO futarchy proposal, read from its on-chain account. */
export function useProposalState(address?: string) {
  const { connection } = useConnection()
  const [state, setState] = useState<ProposalStatus | null>(null)

  useEffect(() => {
    if (!address) return
    let alive = true
    connection
      .getAccountInfo(new PublicKey(address), { dataSlice: { offset: STATE_OFFSET, length: 1 } })
      .then((account) => {
        if (alive && account?.data.length) setState(STATES[account.data[0]] ?? null)
      })
      .catch(() => {
        // Keep the snapshot status if the RPC is unavailable
      })
    return () => {
      alive = false
    }
  }, [connection, address])

  return state
}
