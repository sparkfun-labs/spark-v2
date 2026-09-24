/**
 * Cloudflare Pages Function: token price and all-time high for Spark idea tokens.
 * Fetches GeckoTerminal server-side, caches at the edge, and serves the last good value
 * when GeckoTerminal rate limits or blocks the request.
 */
import { IDEAS } from '../../src/data/ideas'

const GECKO = 'https://api.geckoterminal.com/api/v2/networks/solana'
const FRESH_SECONDS = 300
const LAST_GOOD_SECONDS = 7 * 24 * 3600
const ALLOWED_MINTS = new Set(IDEAS.map((i) => i.mint).filter(Boolean))

type Market = { price: number; ath: number; pool: string } | null
type GeckoPool = {
  attributes: { address: string; base_token_price_usd: string; quote_token_price_usd: string; reserve_in_usd?: string }
  relationships: { base_token: { data: { id: string } } }
}

class NotFound extends Error {}

const json = (body: unknown, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
  })

async function gecko<T>(path: string): Promise<T> {
  const res = await fetch(`${GECKO}${path}`, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new NotFound(path)
  if (!res.ok) throw new Error(`GeckoTerminal ${res.status}`)
  return (await res.json()) as T
}

async function loadMarket(mint: string, previous: Market): Promise<Market> {
  let pools: GeckoPool[]
  try {
    pools = (await gecko<{ data?: GeckoPool[] }>(`/tokens/${mint}/pools?page=1`)).data ?? []
  } catch (e) {
    if (e instanceof NotFound) return null // token not indexed yet: no market
    throw e
  }
  if (!pools.length) return null

  const ranked = [...pools].sort((a, b) => Number(b.attributes.reserve_in_usd ?? 0) - Number(a.attributes.reserve_in_usd ?? 0))
  const top = ranked[0]
  const isBase = (p: GeckoPool) => p.relationships.base_token.data.id === `solana_${mint}`
  const price = Number(isBase(top) ? top.attributes.base_token_price_usd : top.attributes.quote_token_price_usd)

  // ATH: highest daily high across the three most liquid pools; pools without candles are skipped.
  const highs = await Promise.all(
    ranked.slice(0, 3).map((p) =>
      gecko<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(
        `/pools/${p.attributes.address}/ohlcv/day?limit=1000&currency=usd&token=${isBase(p) ? 'base' : 'quote'}`,
      )
        .then((r) => (r.data?.attributes?.ohlcv_list ?? []).map((c) => c[2]))
        .catch(() => [] as number[]),
    ),
  )

  const ath = Math.max(price, previous?.ath ?? 0, ...highs.flat())
  return { price, ath, pool: top.attributes.address }
}

export const onRequestGet = async ({ request }: { request: Request }) => {
  const mint = new URL(request.url).searchParams.get('mint') ?? ''
  if (!ALLOWED_MINTS.has(mint)) return json({ error: 'Unknown token' }, 404)

  const cache = (caches as unknown as { default: Cache }).default
  const freshKey = new Request(`https://spark-market-cache/v3/fresh/${mint}`)
  const lastGoodKey = new Request(`https://spark-market-cache/v3/last-good/${mint}`)

  const fresh = await cache.match(freshKey)
  if (fresh) return fresh

  const lastGoodRes = await cache.match(lastGoodKey)
  const lastGood: Market = lastGoodRes ? await lastGoodRes.json() : null

  try {
    const market = await loadMarket(mint, lastGood)
    const response = json(market, 200, FRESH_SECONDS)
    await Promise.all([cache.put(freshKey, response.clone()), cache.put(lastGoodKey, json(market, 200, LAST_GOOD_SECONDS))])
    return response
  } catch {
    // Rate limited or blocked upstream: serve the last good value if we have one.
    return lastGoodRes ? json(lastGood, 200, 60) : json({ error: 'Market data unavailable' }, 502)
  }
}
