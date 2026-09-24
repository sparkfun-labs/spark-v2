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
])

const MAX_BATCH = 20

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
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const calls = Array.isArray(body) ? body : [body]
  if (calls.length === 0 || calls.length > MAX_BATCH || !calls.every(isAllowedCall)) {
    return json({ error: 'Method not allowed' }, 403)
  }

  const upstream = await fetch(env.HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
