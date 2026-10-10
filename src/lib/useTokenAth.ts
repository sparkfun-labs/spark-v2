import { useEffect, useState } from 'react'

/*
 * Token all-time highs, computed every 6 hours by a GitHub Actions job (scripts/update-ath.mjs)
 * and served with the site as /ath.json. Visitors never call GeckoTerminal themselves.
 * Rule: highest traded price across the 3 most liquid pools, ignoring a spike seen in only one pool.
 */
export type Twap = { price: number; from: string; days: number; final: boolean }
type AthFile = { updatedAt: string; ath: Record<string, number>; twap?: Record<string, Twap> }

let file: Promise<AthFile | null> | null = null

const loadFile = () =>
  (file ??= fetch('/ath.json')
    .then((res) => (res.ok && res.headers.get('content-type')?.includes('json') ? (res.json() as Promise<AthFile>) : null))
    .catch(() => null))

/** Token all-time high in USD, or null when not computed (pages fall back to the stored snapshot). */
export function useTokenAth(mint?: string) {
  const [ath, setAth] = useState<number | null>(null)

  useEffect(() => {
    if (!mint) return
    let alive = true
    loadFile().then((data) => {
      if (alive) setAth(data?.ath[mint] ?? null)
    })
    return () => {
      alive = false
    }
  }, [mint])

  return ath
}

/**
 * 3-month TWAP of a Season 2 coin from the same file: average daily close over the 90 days after its raise,
 * frozen once those days are over (`final`). Null when not computed for this coin.
 */
export function useTokenTwap(mint?: string) {
  const [twap, setTwap] = useState<Twap | null>(null)

  useEffect(() => {
    if (!mint) return
    let alive = true
    loadFile().then((data) => {
      if (alive) setTwap(data?.twap?.[mint] ?? null)
    })
    return () => {
      alive = false
    }
  }, [mint])

  return twap
}
