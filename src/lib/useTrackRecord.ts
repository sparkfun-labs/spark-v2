import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { TRACK_RECORD_BASE, season } from '../data/ideas'
import { fetchLaunch, type LaunchSnapshot } from './futardio'

const floorK = (n: number) => `$${Math.floor(n / 1000)}K+`

/**
 * "Proof, not promises" figures across Season 1 and Season 2.
 * Season 1 values are baselines; Season 2 is read from each launch on-chain (with static fallbacks).
 */
export function useTrackRecord() {
  const { connection } = useConnection()
  const [chain, setChain] = useState<Record<string, LaunchSnapshot>>({})

  useEffect(() => {
    let alive = true
    const launches = season(2).filter((i) => i.launchAddress)
    Promise.allSettled(launches.map(async (i) => [i.slug, await fetchLaunch(connection, i.launchAddress!)] as const)).then((results) => {
      if (!alive) return
      const next: Record<string, LaunchSnapshot> = {}
      for (const r of results) if (r.status === 'fulfilled') next[r.value[0]] = r.value[1]
      setChain(next)
    })
    return () => {
      alive = false
    }
  }, [connection])

  let raised = TRACK_RECORD_BASE.season1Raised
  let committed = season(1).reduce((sum, i) => sum + i.raised, 0)
  let ideasFunded = TRACK_RECORD_BASE.ideasFunded
  let builders = TRACK_RECORD_BASE.builders
  // Season 2 investors are counted as distinct wallets across launches
  const seasonTwoWallets = new Set<string>()
  let seasonTwoFallbackFunders = 0

  for (const idea of season(2)) {
    const snap = chain[idea.slug]
    const ideaCommitted = snap?.totalCommitted ?? idea.raised
    const goal = snap?.minimumRaise || idea.goal

    raised += snap && snap.totalApproved > 0 ? snap.totalApproved : Math.min(ideaCommitted, goal)
    committed += ideaCommitted
    if (goal > 0 && ideaCommitted >= goal) ideasFunded += 1
    builders += idea.builders ?? 0

    if (snap?.funderAddresses) snap.funderAddresses.forEach((w) => seasonTwoWallets.add(w))
    else seasonTwoFallbackFunders += idea.funders ?? 0
  }

  return [
    { label: 'Total raised', value: floorK(raised) },
    { label: 'Total commit', value: floorK(committed) },
    { label: 'Ideas funded', value: String(ideasFunded) },
    { label: 'Investors', value: String(TRACK_RECORD_BASE.investors + seasonTwoWallets.size + seasonTwoFallbackFunders) },
    { label: 'Builders', value: String(builders) },
  ]
}
