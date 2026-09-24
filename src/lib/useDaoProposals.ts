import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { fetchDaoProposals, type OnchainProposal } from './daoProposals'

const REFRESH_MS = 60_000
// Shared between every component showing the same DAO, so the chain is scanned once per minute at most.
const cache = new Map<string, { at: number; promise: Promise<OnchainProposal[]> }>()

/** Live list of a DAO's proposals (null until loaded or when no DAO exists yet). */
export function useDaoProposals(dao?: string) {
  const { connection } = useConnection()
  const [proposals, setProposals] = useState<OnchainProposal[] | null>(null)

  useEffect(() => {
    if (!dao) return
    let alive = true

    const load = () => {
      const hit = cache.get(dao)
      const fresh = hit && Date.now() - hit.at < REFRESH_MS - 5_000
      const promise = fresh ? hit.promise : fetchDaoProposals(connection, dao)
      if (!fresh) cache.set(dao, { at: Date.now(), promise })
      promise
        .then((list) => {
          if (alive) setProposals(list)
        })
        .catch(() => cache.delete(dao))
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [connection, dao])

  return proposals
}
