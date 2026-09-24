import { useEffect, useState } from 'react'

/** Live price from Jupiter. `ath` is the live price too: pages take the max with the idea's stored ATH. */
export type TokenMarket = { price: number; ath: number }

/*
 * Jupiter Price API, called from the browser: it allows the site's origin (CORS), while price APIs
 * called from Cloudflare's servers get blocked. Jupiter only prices tokens with enough liquidity,
 * so illiquid tokens resolve to null and pages fall back to the stored snapshot.
 */
const JUPITER_PRICE = 'https://lite-api.jup.ag/price/v3'
const TTL_MS = 60_000
const MAX_IDS = 50

type Entry = { at: number; promise: Promise<number | null> }
const cache = new Map<string, Entry>()
let batch: { mints: string[]; resolve: (prices: Record<string, number>) => void; done: Promise<Record<string, number>> } | null = null

/** Every card asking for a price in the same tick shares one request. */
async function flush() {
  const current = batch!
  batch = null
  const prices: Record<string, number> = {}
  for (let i = 0; i < current.mints.length; i += MAX_IDS) {
    try {
      const res = await fetch(`${JUPITER_PRICE}?ids=${current.mints.slice(i, i + MAX_IDS).join(',')}`)
      if (!res.ok) continue
      const data = (await res.json()) as Record<string, { usdPrice?: number } | null>
      for (const [mint, info] of Object.entries(data)) {
        if (typeof info?.usdPrice === 'number' && info.usdPrice > 0) prices[mint] = info.usdPrice
      }
    } catch {
      // Network error: these tokens fall back to their snapshot
    }
  }
  current.resolve(prices)
}

function loadPrice(mint: string) {
  const hit = cache.get(mint)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise
  if (!batch) {
    let resolve!: (prices: Record<string, number>) => void
    const done = new Promise<Record<string, number>>((r) => (resolve = r))
    batch = { mints: [], resolve, done }
    setTimeout(flush, 0)
  }
  batch.mints.push(mint)
  const promise = batch.done.then((prices) => prices[mint] ?? null)
  cache.set(mint, { at: Date.now(), promise })
  return promise
}

/** Live token price (refreshed every minute), or null when Jupiter has no price for it. */
export function useTokenMarket(mint?: string) {
  const [market, setMarket] = useState<TokenMarket | null>(null)

  useEffect(() => {
    if (!mint) return
    let alive = true
    const load = () =>
      loadPrice(mint).then((price) => {
        if (alive) setMarket(price == null ? null : { price, ath: price })
      })
    load()
    const timer = setInterval(load, TTL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [mint])

  return market
}
