import { useEffect, useState } from 'react'

export type TokenMarket = { price: number; ath: number; pool: string }

const GECKO = 'https://api.geckoterminal.com/api/v2/networks/solana'

type GeckoPool = {
  attributes: { address: string; base_token_price_usd: string; quote_token_price_usd: string; reserve_in_usd?: string }
  relationships: { base_token: { data: { id: string } } }
}

// One lookup per mint per page load, shared by every card showing the same token.
const cache = new Map<string, Promise<TokenMarket | null>>()

// Direct GeckoTerminal calls (local dev only) run one at a time: bursts get rate limited.
let queue: Promise<unknown> = Promise.resolve()
const enqueue = <T>(task: () => Promise<T>) => {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Resolves null on 404 (token or pool not indexed); retries rate-limited requests. */
async function geckoJson(url: string, attempts = 4): Promise<unknown> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res.json()
      if (res.status === 404) return null
    } catch {
      // Rate-limited responses carry no CORS headers and surface as network errors
    }
    await wait(2000 * (i + 1))
  }
  throw new Error('GeckoTerminal unavailable')
}

async function loadDirect(mint: string): Promise<TokenMarket | null> {
  const pools = ((await geckoJson(`${GECKO}/tokens/${mint}/pools?page=1`)) as { data?: GeckoPool[] } | null)?.data ?? []
  if (!pools.length) return null

  const top = [...pools].sort((a, b) => Number(b.attributes.reserve_in_usd ?? 0) - Number(a.attributes.reserve_in_usd ?? 0))[0]
  const isBase = top.relationships.base_token.data.id === `solana_${mint}`
  const price = Number(isBase ? top.attributes.base_token_price_usd : top.attributes.quote_token_price_usd)

  const ohlcv = (await geckoJson(
    `${GECKO}/pools/${top.attributes.address}/ohlcv/day?limit=1000&currency=usd&token=${isBase ? 'base' : 'quote'}`,
  ).catch(() => null)) as { data?: { attributes?: { ohlcv_list?: number[][] } } } | null
  const candles = ohlcv?.data?.attributes?.ohlcv_list ?? []

  return { price, ath: Math.max(price, ...candles.map((c) => c[2])), pool: top.attributes.address }
}

async function loadMarket(mint: string): Promise<TokenMarket | null> {
  // Production: edge-cached Pages Function (functions/api/market.ts)
  try {
    const res = await fetch(`/api/market?mint=${mint}`)
    const isJson = res.headers.get('content-type')?.includes('application/json')
    if (res.ok && isJson) return (await res.json()) as TokenMarket | null
    if (isJson) return null
  } catch {
    // Fall through to direct lookup in local dev
  }
  // Only local dev (no Pages Functions) talks to GeckoTerminal directly; production relies on the snapshot fallback.
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return null
  return enqueue(() => loadDirect(mint))
}

/** Token price and all-time high (GeckoTerminal, most liquid pool). */
export function useTokenMarket(mint?: string) {
  const [market, setMarket] = useState<TokenMarket | null>(null)

  useEffect(() => {
    if (!mint) return
    let alive = true
    if (!cache.has(mint)) cache.set(mint, loadMarket(mint).catch(() => null))
    cache.get(mint)!.then((m) => {
      if (alive) setMarket(m)
    })
    return () => {
      alive = false
    }
  }, [mint])

  return market
}
