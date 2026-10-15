/**
 * Cloudflare Pages Function: Solana JSON-RPC proxy.
 * Keeps the Helius key server-side (secret HELIUS_RPC_URL) and only forwards what the site needs.
 */

interface Env {
  HELIUS_RPC_URL: string
  /** Optional comma-separated extra origins allowed to call the proxy (e.g. https://justspark.fun) */
  ALLOWED_ORIGINS?: string
}

type RpcCall = { method?: unknown; params?: unknown }

/** getProgramAccounts is expensive: only allowed on the launchpad and futarchy (DAO proposals) programs */
const SCANNABLE_PROGRAMS = new Set([
  'moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM', // MetaDAO launchpad v0.7
  'FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq', // MetaDAO futarchy v0.6
])

const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getMultipleAccounts',
  'getProgramAccounts',
  'getTokenAccountBalance',
  'getBalance',
  'getLatestBlockhash',
  'isBlockhashValid',
  'getBlockHeight',
  'getSlot',
  'getEpochInfo',
  'getFeeForMessage',
  'getMinimumBalanceForRentExemption',
  'getRecentPrioritizationFees',
  'getSignatureStatuses',
  'getGenesisHash',
  'getVersion',
  'simulateTransaction',
  'sendTransaction',
  // Proposal titles come from the memo of the transaction that created them
  'getSignaturesForAddress',
  'getTransaction',
  // Helius: full transactions of an address, 100 per call (proposal price history reads the DAO's swaps with it)
  'getTransactionsForAddress',
])

const MAX_BATCH = 20

/**
 * Read-only calls are cached at the edge (seconds), so visitors share Helius calls instead of each repeating them.
 * Confirmed transactions never change; address histories only grow; accounts are cached for a few seconds.
 */
const CACHE_TTL: Record<string, number> = {
  getTransaction: 86_400,
  getTransactionsForAddress: 30,
  getSignaturesForAddress: 15,
  // Every visitor of a page reads the same accounts (launches, DAOs, pools): a few seconds of cache lets them share
  // one Helius call. Short enough that a user's own funding or trade shows up on the next refresh.
  getProgramAccounts: 15,
  getAccountInfo: 5,
  getMultipleAccounts: 5,
}

async function cacheKey(request: Request, text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return new Request(`${new URL(request.url).origin}/api/rpc/cache/${hex}`)
}

/** Only complete answers are cached: no RPC error, and no transaction missing (not confirmed yet) */
function cacheable(payload: unknown) {
  const items = Array.isArray(payload) ? payload : [payload]
  return items.every((r) => r && typeof r === 'object' && !('error' in r) && (r as { result?: unknown }).result != null)
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function isAllowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return origin === new URL(request.url).origin || extra.includes(origin)
}

function isAllowedCall(call: RpcCall) {
  if (typeof call?.method !== 'string' || !ALLOWED_METHODS.has(call.method)) return false
  if (call.method === 'getProgramAccounts') {
    return Array.isArray(call.params) && SCANNABLE_PROGRAMS.has(call.params[0])
  }
  return true
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.HELIUS_RPC_URL) return json({ error: 'RPC not configured' }, 500)
  if (!isAllowedOrigin(request, env)) return json({ error: 'Forbidden origin' }, 403)

  let body: RpcCall | RpcCall[]
  const text = await request.text()
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const calls = Array.isArray(body) ? body : [body]
  if (calls.length === 0 || calls.length > MAX_BATCH || !calls.every(isAllowedCall)) {
    return json({ error: 'Method not allowed' }, 403)
  }

  const ttl = Math.min(...calls.map((c) => CACHE_TTL[c.method as string] ?? 0))
  const edge = (caches as unknown as { default: Cache }).default
  const key = ttl > 0 ? await cacheKey(request, text) : null
  if (key) {
    const hit = await edge.match(key)
    if (hit) return new Response(hit.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Cache': 'HIT' } })
  }

  const upstream = await fetch(env.HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (key && upstream.ok) {
    const result = await upstream.text()
    try {
      if (cacheable(JSON.parse(result))) {
        await edge.put(key, new Response(result, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` } }))
      }
    } catch {
      // Not JSON: pass it through uncached
    }
    return new Response(result, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Cache': 'MISS' } })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
