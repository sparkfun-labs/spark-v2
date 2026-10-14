import { BorshEventCoder, utils, type Idl } from '@coral-xyz/anchor'
import { IDL } from './idl/futarchy_v6'
import { FUTARCHY_PROGRAM_ID } from './daoProposals'

export type PricePoint = { t: number; pass: number; fail: number; spot: number }
/** Prices as raw reserve ratios (quote units per base unit): the caller scales them once it knows the decimals */
export type ProposalHistory = { points: PricePoint[]; finalizedAt?: number }
/** When the proposal's market was open, in ms. Known from the proposal account, so the DAO can be read right away. */
export type MarketWindow = { from: number; to?: number }

type Reserves = { baseReserves: { toString(): string }; quoteReserves: { toString(): string } }
type FutarchyEvent = {
  proposal?: { toBase58(): string }
  dao?: { toBase58(): string }
  postAmmState?: { state?: { futarchy?: { spot: Reserves; pass: Reserves; fail: Reserves } } }
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
type Signature = { signature: string; err: unknown }
type RpcResponse<T> = { result?: T; error?: { message: string } }

const coder = new BorshEventCoder(IDL as Idl)
const FUTARCHY = FUTARCHY_PROGRAM_ID.toBase58()
/** getTransaction calls per batch: kept small, Helius counts each call against its rate limit */
const BATCH = 5
/** Pages of 100 DAO transactions read per refresh (Helius getTransactionsForAddress) */
const MAX_DAO_PAGES = 30
const PRICED_EVENTS = new Set(['LaunchProposalEvent', 'ConditionalSwapEvent'])
const STORAGE_PREFIX = 'spark:proposal-history:v1:'

type Entry = {
  own: PricePoint[]
  spot: PricePoint[]
  launchedAt?: number
  finalizedAt?: number
  /** Newest signature of the proposal already read */
  newest?: string
  /** Block time (s) the DAO was read up to, and the signatures already read at that second */
  daoCursor?: number
  daoSeen: string[]
  /** Finalized and fully read: never fetched again */
  complete?: boolean
}

const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<ProposalHistory>>()

function restore(proposal: string): Entry {
  const memo = cache.get(proposal)
  if (memo) return memo
  try {
    const saved = localStorage.getItem(STORAGE_PREFIX + proposal)
    if (saved) {
      const entry = JSON.parse(saved) as Entry
      cache.set(proposal, entry)
      return entry
    }
  } catch {
    // Storage unavailable: start from scratch
  }
  const entry: Entry = { own: [], spot: [], daoSeen: [] }
  cache.set(proposal, entry)
  return entry
}

function persist(proposal: string, entry: Entry) {
  try {
    localStorage.setItem(STORAGE_PREFIX + proposal, JSON.stringify(entry))
  } catch {
    // Full or blocked storage only costs a slower next visit
  }
}

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  return res.json()
}

const ratio = (p: Reserves) => Number(p.quoteReserves.toString()) / Number(p.baseReserves.toString())

/** Futarchy events of a transaction (Anchor emit_cpi: the event is the data of a self-invoked inner instruction, after an 8 byte tag) */
function events(tx: RawTransaction | null | undefined) {
  if (!tx?.meta || tx.meta.err || !tx.blockTime) return []
  const t = tx.blockTime * 1000
  const keys = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])]
  const out: { t: number; name: string; data: FutarchyEvent }[] = []
  for (const inner of tx.meta.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      if (keys[ix.programIdIndex] !== FUTARCHY) continue
      const data = Buffer.from(utils.bytes.bs58.decode(ix.data))
      if (data.length <= 16) continue
      const event = coder.decode(data.subarray(8).toString('base64'))
      if (event) out.push({ t, name: event.name, data: event.data as FutarchyEvent })
    }
  }
  return out
}

const point = (t: number, d: FutarchyEvent): PricePoint | null => {
  const pools = d.postAmmState?.state?.futarchy
  return pools ? { t, pass: ratio(pools.pass), fail: ratio(pools.fail), spot: ratio(pools.spot) } : null
}

/** The proposal's own transactions: launch, conditional swaps and finalization. Few, read one by one. */
async function readOwn(endpoint: string, proposal: string, entry: Entry) {
  const sigs = await rpc<RpcResponse<Signature[]>>(endpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [proposal, { limit: 1000, until: entry.newest, commitment: 'confirmed' }],
  })
  if (!sigs.result) throw new Error(sigs.error?.message ?? 'getSignaturesForAddress failed')
  const todo = sigs.result.filter((s) => !s.err)
  const batches = []
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
  const results = await Promise.all(
    batches.map((batch) =>
      rpc<RpcResponse<RawTransaction | null>[]>(
        endpoint,
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
      if (e.data.proposal && e.data.proposal.toBase58() !== proposal) continue
      if (e.name === 'LaunchProposalEvent') entry.launchedAt = e.t
      if (e.name === 'FinalizeProposalEvent') entry.finalizedAt = e.t
      const p = PRICED_EVENTS.has(e.name) ? point(e.t, e.data) : null
      if (p) entry.own.push(p)
    }
  }
  if (sigs.result.length) entry.newest = sigs.result[0].signature
}

/**
 * The DAO's spot swaps while the market is open: during a proposal they trade through the pass and fail pools too,
 * and carry most of the volume. Arbitrage bots touch the DAO in most transactions, so failures are filtered
 * server-side and full transactions come 100 at a time (Helius getTransactionsForAddress), oldest first.
 */
async function readDao(endpoint: string, dao: string, window: MarketWindow, entry: Entry): Promise<boolean> {
  const from = entry.daoCursor ?? Math.floor(window.from / 1000) - 60
  const to = window.to != null ? Math.ceil(window.to / 1000) + 60 : undefined
  if (to != null && from > to) return true
  const seen = new Set(entry.daoSeen)
  let paginationToken: string | undefined
  for (let page = 0; page < MAX_DAO_PAGES; page++) {
    const res = await rpc<RpcResponse<{ data: RawTransaction[]; paginationToken?: string | null }>>(endpoint, {
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
          filters: { status: 'succeeded', blockTime: { gte: from, ...(to != null && { lte: to }) } },
        },
      ],
    })
    if (!res.result) throw new Error(res.error?.message ?? 'getTransactionsForAddress failed')
    for (const tx of res.result.data) {
      const signature = tx.transaction.signatures[0]
      if (seen.has(signature) || !tx.blockTime) continue
      for (const e of events(tx)) {
        if (e.name !== 'SpotSwapEvent' || e.data.dao?.toBase58() !== dao) continue
        const p = point(e.t, e.data)
        if (p) entry.spot.push(p)
      }
      // Progress is saved per transaction, so a failed page resumes where it stopped
      if (tx.blockTime !== entry.daoCursor) {
        entry.daoCursor = tx.blockTime
        entry.daoSeen = []
      }
      entry.daoSeen.push(signature)
      seen.add(signature)
    }
    paginationToken = res.result.paginationToken ?? undefined
    if (!paginationToken || res.result.data.length < 100) return true
  }
  return false
}

function view(entry: Entry): ProposalHistory {
  const start = entry.launchedAt ?? -Infinity
  const end = entry.finalizedAt ?? Infinity
  const points = [...entry.own, ...entry.spot.filter((p) => p.t >= start && p.t <= end)].sort((a, b) => a.t - b.t)
  return { points, finalizedAt: entry.finalizedAt }
}

async function load(endpoint: string, proposal: string, dao: string, window: MarketWindow): Promise<ProposalHistory> {
  const entry = restore(proposal)
  if (entry.complete) return view(entry)
  try {
    // Both sources are read at the same time: the market window comes from the proposal account, not from its events
    const [, daoRead] = await Promise.all([readOwn(endpoint, proposal, entry), readDao(endpoint, dao, window, entry)])
    // A closed window read to the end never changes again
    if (entry.finalizedAt != null && window.to != null && window.to < Date.now() && daoRead) entry.complete = true
  } finally {
    persist(proposal, entry)
  }
  return view(entry)
}

/** History saved by a previous visit, shown right away while the refresh runs */
export function cachedProposalHistory(proposal: string): ProposalHistory | null {
  const entry = restore(proposal)
  return entry.own.length || entry.spot.length ? view(entry) : null
}

export function fetchProposalHistory(endpoint: string, proposal: string, dao: string, window: MarketWindow) {
  // Concurrent callers share one request so points are never added twice
  const running = inflight.get(proposal)
  if (running) return running
  const promise = load(endpoint, proposal, dao, window).finally(() => inflight.delete(proposal))
  inflight.set(proposal, promise)
  return promise
}
