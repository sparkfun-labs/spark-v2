import { useCallback, useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { fetchDaoProposals, type OnchainProposal } from './daoProposals'
import { usePolling } from './usePolling'

const REFRESH_MS = 120_000
// Shared between every component showing the same DAO, so the chain is scanned once per minute at most.
const cache = new Map<string, { at: number; promise: Promise<OnchainProposal[]> }>()

/** Live list of a DAO's proposals (null until loaded or when no DAO exists yet). */
export function useDaoProposals(dao?: string) {
  const { connection } = useConnection()
  const [proposals, setProposals] = useState<OnchainProposal[] | null>(null)

  const load = useCallback(() => {
    if (!dao) return
    const hit = cache.get(dao)
    const fresh = hit && Date.now() - hit.at < REFRESH_MS - 5_000
    const promise = fresh ? hit.promise : fetchDaoProposals(connection, dao)
    if (!fresh) cache.set(dao, { at: Date.now(), promise })
    promise.then(setProposals).catch(() => cache.delete(dao))
  }, [connection, dao])

  useEffect(() => {
    load()
  }, [load])
  usePolling(load, dao ? REFRESH_MS : null)

  return proposals
}
