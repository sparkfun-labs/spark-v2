// Computes each idea token's all-time high and writes public/ath.json.
// Runs on a schedule in GitHub Actions (.github/workflows/update-ath.yml): GeckoTerminal blocks
// Cloudflare's servers, and calling it from every visitor's browser would hit its rate limit.
//
// ATH = highest traded price (daily candle highs) across the token's 3 most liquid pools.
// When 3 pools qualify, the highest one is ignored: a spike has to show up in at least two pools,
// so a single thin trade in one pool (LFOWN on Sept 18) does not become the ATH.
//
// Usage: node scripts/update-ath.mjs

import { readFileSync, writeFileSync } from 'node:fs'

const GECKO = 'https://api.geckoterminal.com/api/v2/networks/solana'
const MIN_RESERVE_USD = 100
const MAX_POOLS = 3
const SPACING_MS = 2500
const OUTPUT = new URL('../public/ath.json', import.meta.url)
const IDEAS = new URL('../src/data/ideas.ts', import.meta.url)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function gecko(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await wait(attempt === 0 ? SPACING_MS : 20_000 * attempt)
    const res = await fetch(`${GECKO}${path}`, { headers: { Accept: 'application/json' } })
    if (res.ok) return res.json()
    if (res.status === 404) return null
    console.warn(`GeckoTerminal ${res.status} on ${path}, retrying`)
  }
  throw new Error(`GeckoTerminal unavailable for ${path}`)
}

async function computeAth(mint) {
  const pools = (await gecko(`/tokens/${mint}/pools?page=1`))?.data ?? []
  const liquid = pools
    .filter((p) => Number(p.attributes.reserve_in_usd ?? 0) >= MIN_RESERVE_USD)
    .sort((a, b) => Number(b.attributes.reserve_in_usd) - Number(a.attributes.reserve_in_usd))
    .slice(0, MAX_POOLS)

  const highs = []
  for (const pool of liquid) {
    const side = pool.relationships.base_token.data.id === `solana_${mint}` ? 'base' : 'quote'
    const candles =
      (await gecko(`/pools/${pool.attributes.address}/ohlcv/day?limit=1000&currency=usd&token=${side}`))?.data?.attributes
        ?.ohlcv_list ?? []
    if (candles.length) highs.push(Math.max(...candles.map((c) => c[2])))
  }
  if (!highs.length) return null
  highs.sort((a, b) => b - a)
  return highs.length >= MAX_POOLS ? highs[1] : highs[0]
}

const mints = [...new Set([...readFileSync(IDEAS, 'utf8').matchAll(/mint: '([1-9A-HJ-NP-Za-km-z]{32,44})'/g)].map((m) => m[1]))]
const previous = (() => {
  try {
    return JSON.parse(readFileSync(OUTPUT, 'utf8')).ath ?? {}
  } catch {
    return {}
  }
})()

const ath = {}
for (const mint of mints) {
  try {
    const value = await computeAth(mint)
    // An ATH never goes down: keep the previous value if the new computation is lower or missing
    const best = Math.max(value ?? 0, previous[mint] ?? 0)
    if (best > 0) ath[mint] = Number(best.toPrecision(6))
    console.log(mint, value, '->', ath[mint])
  } catch (e) {
    console.warn(mint, e.message)
    if (previous[mint]) ath[mint] = previous[mint]
  }
}

const unchanged = JSON.stringify(ath) === JSON.stringify(previous)
if (unchanged) {
  console.log('No ATH change')
} else {
  writeFileSync(OUTPUT, `${JSON.stringify({ updatedAt: new Date().toISOString(), ath }, null, 2)}\n`)
  console.log('Wrote', OUTPUT.pathname)
}
