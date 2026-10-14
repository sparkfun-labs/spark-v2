/**
 * Cloudflare Pages Function: price history of a futarchy proposal, computed server-side.
 * GET /api/proposal-history?proposal=…&dao=…&from=…&to=…  (from / to: market window, unix seconds)
 *
 * Returns { points: [{ t, pass, fail, spot }], finalizedAt? } with prices as raw reserve ratios
 * (quote units per base unit): the page scales them with the token decimals.
 *
 * Sources, same as src/lib/proposalHistory.ts (the in-browser fallback):
 * - the proposal's own transactions: launch, conditional swaps, finalization;
 * - the DAO's spot swaps while the market is open (they trade through the pass and fail pools too), read 100 at a time,
 *   successful only (Helius getTransactionsForAddress), because arbitrage bots touch the DAO in most transactions.
 *
 * Every visitor gets the same small JSON from the edge cache. On a miss, the previous state is reloaded from the
 * cache and only transactions newer than it are read.
 */

interface Env {
  HELIUS_RPC_URL: string
}

type Point = { t: number; pass: number; fail: number; spot: number }
type State = {
  own: Point[]
  spot: Point[]
  launchedAt?: number
  finalizedAt?: number
  newest?: string
  daoCursor?: number
  daoSeen: string[]
  checked?: boolean
}
type RawTransaction = {
  blockTime: number | null
  transaction: { signatures: string[]; message: { accountKeys: string[] } }
  meta: {
    err: unknown
    loadedAddresses?: { writable: string[]; readonly: string[] }
    innerInstructions?: { instructions: { programIdIndex: number; data: string }[] }[]
  } | null
}

const FUTARCHY = 'FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq'
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const MAX_WINDOW_S = 14 * 86_400
const MAX_DAO_PAGES = 30
const BATCH = 5
const OPEN_TTL = 30
const CLOSED_TTL = 86_400

// Anchor event discriminators: sha256("event:<Name>")[0..8]
const LAUNCH = 'b137bf5dcb7cb80b'
const CONDITIONAL_SWAP = '02a6c8a05ed4442d'
const SPOT_SWAP = '1dfd79ff523c94c3'
const FINALIZE = '2d1d7ab54fe0398d'
/** emit_cpi wraps every event in a self-invoked instruction starting with this tag */
const EVENT_IX_TAG = 'e445a52e51cb9a1d'

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function base58(text: string): Uint8Array {
  const bytes: number[] = []
  for (const char of text) {
    let carry = ALPHABET.indexOf(char)
    if (carry < 0) return new Uint8Array()
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (const char of text) {
    if (char !== '1') break
    bytes.push(0)
  }
  return new Uint8Array(bytes.reverse())
}
const encode58 = (bytes: Uint8Array) => {
  const digits = [0]
  for (const byte of bytes) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = ''
  for (const byte of bytes) {
    if (byte !== 0) break
    out += '1'
  }
  return out + digits.reverse().map((d) => ALPHABET[d]).join('')
}
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
const u64 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset).getBigUint64(o, true)

/*
 * Layouts (borsh): CommonFields = 24 bytes. Pool = TwapOracle (100 bytes) + quote_reserves u64 + base_reserves u64
 * + two fee balances = 132 bytes. FutarchyAmm starts with the PoolState tag (1 = Futarchy: spot, pass, fail pools).
 */
const POOL = 132
function pools(b: Uint8Array, amm: number) {
  if (b[amm] !== 1) return null
  const ratio = (pool: number) => Number(u64(b, pool + 100)) / Number(u64(b, pool + 108))
  const first = amm + 1
  return { spot: ratio(first), pass: ratio(first + POOL), fail: ratio(first + 2 * POOL) }
}

type Decoded = { kind: 'launch' | 'conditional' | 'spot' | 'finalize'; proposal?: string; dao?: string; prices: ReturnType<typeof pools> }

function decodeEvent(data: Uint8Array): Decoded | null {
  if (data.length < 16 || hex(data.subarray(0, 8)) !== EVENT_IX_TAG) return null
  const b = data.subarray(8)
  const key = (o: number) => encode58(b.subarray(o, o + 32))
  switch (hex(b.subarray(0, 8))) {
    case LAUNCH: // common, proposal, dao, timestamp_enqueued, total_staked, amm
      return { kind: 'launch', proposal: key(32), dao: key(64), prices: pools(b, 8 + 24 + 32 + 32 + 8 + 8) }
    case CONDITIONAL_SWAP: // common, dao, proposal, trader, market (1), swap_type (1), 3 x u64, amm
      return { kind: 'conditional', dao: key(32), proposal: key(64), prices: pools(b, 8 + 24 + 96 + 2 + 24) }
    case SPOT_SWAP: // common, dao, user, swap_type (1), 3 x u64, amm
      return { kind: 'spot', dao: key(32), prices: pools(b, 8 + 24 + 64 + 1 + 24) }
    case FINALIZE: // common, proposal, dao, …
      return { kind: 'finalize', proposal: key(32), dao: key(64), prices: null }
  }
  return null
}

function events(tx: RawTransaction | null | undefined) {
  if (!tx?.meta || tx.meta.err || !tx.blockTime) return []
  const t = tx.blockTime * 1000
  const keys = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])]
  const out: (Decoded & { t: number })[] = []
  for (const inner of tx.meta.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      if (keys[ix.programIdIndex] !== FUTARCHY) continue
      const e = decodeEvent(base58(ix.data))
      if (e) out.push({ ...e, t })
    }
  }
  return out
}

async function rpc<T>(env: Env, body: unknown): Promise<T> {
  const res = await fetch(env.HELIUS_RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  return res.json()
}

async function readOwn(env: Env, proposal: string, state: State) {
  const sigs = await rpc<{ result?: { signature: string; err: unknown }[] }>(env, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [proposal, { limit: 1000, until: state.newest, commitment: 'confirmed' }],
  })
  if (!sigs.result) throw new Error('getSignaturesForAddress failed')
  const todo = sigs.result.filter((s) => !s.err)
  const batches: (typeof todo)[] = []
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
  const results = await Promise.all(
    batches.map((batch) =>
      rpc<{ result: RawTransaction | null }[]>(
        env,
        batch.map((s, id) => ({
          jsonrpc: '2.0',
          id,
          method: 'getTransaction',
          params: [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }],
        })),
      ),
    ),
  )
  for (const { result } of results.flat()) {
    for (const e of events(result)) {
      if (e.proposal !== proposal) continue
      if (e.kind === 'launch') state.launchedAt = e.t
      if (e.kind === 'finalize') state.finalizedAt = e.t
      if ((e.kind === 'launch' || e.kind === 'conditional') && e.prices) state.own.push({ t: e.t, ...e.prices })
    }
  }
  if (sigs.result.length) state.newest = sigs.result[0].signature
}

/** Returns true once the window has been read to its end */
async function readDao(env: Env, dao: string, from: number, to: number, state: State): Promise<boolean> {
  const start = state.daoCursor ?? from - 60
  const seen = new Set(state.daoSeen)
  let paginationToken: string | undefined
  for (let page = 0; page < MAX_DAO_PAGES; page++) {
    const res = await rpc<{ result?: { data: RawTransaction[]; paginationToken?: string | null } }>(env, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransactionsForAddress',
      params: [
        dao,
        {
          transactionDetails: 'full',
          encoding: 'json',
          maxSupportedTransactionVersion: 1,
          sortOrder: 'asc',
          limit: 100,
          paginationToken,
          filters: { status: 'succeeded', blockTime: { gte: start, lte: to + 60 } },
        },
      ],
    })
    if (!res.result) throw new Error('getTransactionsForAddress failed')
    for (const tx of res.result.data) {
      const signature = tx.transaction.signatures[0]
      if (seen.has(signature) || !tx.blockTime) continue
      for (const e of events(tx)) {
        if (e.kind === 'spot' && e.dao === dao && e.prices) state.spot.push({ t: e.t, ...e.prices })
      }
      if (tx.blockTime !== state.daoCursor) {
        state.daoCursor = tx.blockTime
        state.daoSeen = []
      }
      state.daoSeen.push(signature)
      seen.add(signature)
    }
    paginationToken = res.result.paginationToken ?? undefined
    if (!paginationToken || res.result.data.length < 100) return true
  }
  return false
}

/** The proposal must be a futarchy account, so the endpoint can't be used to read arbitrary addresses */
async function isProposal(env: Env, proposal: string) {
  const res = await rpc<{ result?: { value: { owner: string } | null } }>(env, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getAccountInfo',
    params: [proposal, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }],
  })
  return res.result?.value?.owner === FUTARCHY
}

const json = (body: unknown, status: number, maxAge = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store' },
  })

export const onRequestGet = async ({ request, env, waitUntil }: { request: Request; env: Env; waitUntil: (p: Promise<unknown>) => void }) => {
  if (!env.HELIUS_RPC_URL) return json({ error: 'RPC not configured' }, 500)
  const url = new URL(request.url)
  const proposal = url.searchParams.get('proposal') ?? ''
  const dao = url.searchParams.get('dao') ?? ''
  const from = Number(url.searchParams.get('from'))
  const to = Number(url.searchParams.get('to'))
  if (!BASE58.test(proposal) || !BASE58.test(dao) || !Number.isInteger(from) || !Number.isInteger(to) || to < from || to - from > MAX_WINDOW_S) {
    return json({ error: 'Invalid parameters' }, 400)
  }

  const edge = (caches as unknown as { default: Cache }).default
  const responseKey = new Request(`${url.origin}/api/proposal-history/cache?${url.searchParams}`)
  const hit = await edge.match(responseKey)
  if (hit) return hit

  const stateKey = new Request(`${url.origin}/api/proposal-history/state/${proposal}/${dao}/${from}/${to}`)
  const saved = await edge.match(stateKey)
  const state: State = saved ? await saved.json() : { own: [], spot: [], daoSeen: [] }

  try {
    if (!state.checked) {
      if (!(await isProposal(env, proposal))) return json({ error: 'Not a proposal' }, 404)
      state.checked = true
    }
    const [, done] = await Promise.all([readOwn(env, proposal, state), readDao(env, dao, from, to, state)])

    const startAt = state.launchedAt ?? -Infinity
    const endAt = state.finalizedAt ?? Infinity
    const points = [...state.own, ...state.spot.filter((p) => p.t >= startAt && p.t <= endAt)].sort((a, b) => a.t - b.t)
    const closed = state.finalizedAt != null && to * 1000 < Date.now() && done
    const ttl = closed ? CLOSED_TTL : OPEN_TTL

    const response = json({ points, finalizedAt: state.finalizedAt }, 200, ttl)
    waitUntil(
      Promise.all([
        edge.put(responseKey, response.clone()),
        edge.put(stateKey, new Response(JSON.stringify(state), { headers: { 'Cache-Control': `public, max-age=${CLOSED_TTL}` } })),
      ]),
    )
    return response
  } catch (e) {
    return json({ error: (e as Error).message }, 502)
  }
}
