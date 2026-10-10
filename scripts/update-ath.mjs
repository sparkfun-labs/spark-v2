// Computes each idea token's all-time high and writes public/ath.json.
// Runs on a schedule in GitHub Actions (.github/workflows/update-ath.yml): GeckoTerminal blocks
// Cloudflare's servers, and calling it from every visitor's browser would hit its rate limit.
//
// ATH = highest traded price (daily candle highs) across the token's 3 most liquid pools.
// When 3 pools qualify, the highest one is ignored: a spike has to show up in at least two pools,
// so a single thin trade in one pool (LFOWN on Sept 18) does not become the ATH.
//
// It also computes the 3-month TWAP of Season 2 coins that Season 1 ideas were relaunched as (see TWAP_COINS):
// the average daily close over the 90 days after the raise closed, frozen once those 90 days are over.
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

/**
 * Season 2 coins valued at their 3-month TWAP on the Season 1 track record, with the day their raise closed.
 * Keep in sync with `relaunch` in src/data/ideas.ts.
 */
const TWAP_COINS = {
  '2rNBaMg5VAr1aMNCwAPdDZVgzzdTaNDebUnNqPFNmeta': '2026-08-05', // BASKET
  '5FtV5gisCyCqJHsiCne4pX2r6d2YPRF9Kcfx2DKvmeta': '2026-09-22', // PREDICT
}
const TWAP_DAYS = 90
const DAY = 86_400_000

/** Average daily close over the TWAP window, from the most liquid pool. Days without trades keep the last close. */
async function computeTwap(mint, from) {
  const pools = (await gecko(`/tokens/${mint}/pools?page=1`))?.data ?? []
  const pool = pools.sort((a, b) => Number(b.attributes.reserve_in_usd ?? 0) - Number(a.attributes.reserve_in_usd ?? 0))[0]
  if (!pool) return null
  const side = pool.relationships.base_token.data.id === `solana_${mint}` ? 'base' : 'quote'
  const candles =
    (await gecko(`/pools/${pool.attributes.address}/ohlcv/day?limit=1000&currency=usd&token=${side}`))?.data?.attributes
      ?.ohlcv_list ?? []
  const closes = new Map(candles.map((c) => [c[0] * 1000, c[4]]))
  const start = Date.parse(`${from}T00:00:00Z`)
  // Only complete days count, so the value changes once a day
  const end = Math.min(start + TWAP_DAYS * DAY, Math.floor(Date.now() / DAY) * DAY)
  let last = null
  const prices = []
  for (let day = start; day < end; day += DAY) {
    last = closes.get(day) ?? last
    if (last != null) prices.push(last)
  }
  if (!prices.length) return null
  return {
    price: Number((prices.reduce((s, p) => s + p, 0) / prices.length).toPrecision(6)),
    from,
    days: prices.length,
    final: end === start + TWAP_DAYS * DAY,
  }
}

const mints = [...new Set([...readFileSync(IDEAS, 'utf8').matchAll(/mint: '([1-9A-HJ-NP-Za-km-z]{32,44})'/g)].map((m) => m[1]))]
const previousFile = (() => {
  try {
    return JSON.parse(readFileSync(OUTPUT, 'utf8'))
  } catch {
    return {}
  }
})()
const previous = previousFile.ath ?? {}
const previousTwap = previousFile.twap ?? {}

/**
 * ATHs set by hand, used instead of the computed value. For tokens whose pools show a launch-day spike
 * that the 3-pool rule can't filter out. Update by hand if the price ever trades above.
 */
const MANUAL_ATH = {
  y6qTpA6VMXiZfqxcBkyaMSUACXi7LG73sbe6oYspArK: 0.00425, // CLAWPILOT, given by the team (2026-10-10)
}

const ath = {}
for (const mint of mints) {
  if (MANUAL_ATH[mint]) {
    ath[mint] = MANUAL_ATH[mint]
    continue
  }
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

const twap = {}
for (const [mint, from] of Object.entries(TWAP_COINS)) {
  // A finished window never changes
  if (previousTwap[mint]?.final) {
    twap[mint] = previousTwap[mint]
    continue
  }
  try {
    const value = await computeTwap(mint, from)
    if (value) twap[mint] = value
    else if (previousTwap[mint]) twap[mint] = previousTwap[mint]
    console.log('twap', mint, twap[mint])
  } catch (e) {
    console.warn('twap', mint, e.message)
    if (previousTwap[mint]) twap[mint] = previousTwap[mint]
  }
}

const unchanged = JSON.stringify({ ath, twap }) === JSON.stringify({ ath: previous, twap: previousTwap })
if (unchanged) {
  console.log('No change')
} else {
  writeFileSync(OUTPUT, `${JSON.stringify({ updatedAt: new Date().toISOString(), ath, twap }, null, 2)}\n`)
  console.log('Wrote', OUTPUT.pathname)
}
