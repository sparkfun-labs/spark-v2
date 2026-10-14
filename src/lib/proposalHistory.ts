import { BorshEventCoder, utils, type Idl } from '@coral-xyz/anchor'
import { IDL } from './idl/futarchy_v6'
import { FUTARCHY_PROGRAM_ID } from './daoProposals'

export type PricePoint = { t: number; pass: number; fail: number; spot: number }
export type ProposalHistory = { points: PricePoint[]; finalizedAt?: number }

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
type Signature = { signature: string; err: unknown; blockTime: number | null }
type RpcResponse<T> = { result?: T; error?: { message: string } }

const coder = new BorshEventCoder(IDL as Idl)
const FUTARCHY = FUTARCHY_PROGRAM_ID.toBase58()
/** getTransaction calls per batch: kept small, Helius counts each call against its rate limit */
const BATCH = 5
/** Pages of 100 DAO transactions read per refresh (Helius getTransactionsForAddress) */
const MAX_DAO_PAGES = 30
const PRICED_EVENTS = new Set(['LaunchProposalEvent', 'ConditionalSwapEvent'])

type Entry = { newest?: string; daoCursor?: number; seen: Set<string>; points: PricePoint[]; launchedAt?: number; finalizedAt?: number }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<ProposalHistory>>()

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  return res.json()
}

/**
 * Successful transactions of the DAO between two times (seconds), oldest first, 100 per call.
 * The DAO is touched by many arbitrage bots that never trade through it: filtering on success server-side and
 * getting full transactions in pages keeps this to a few calls instead of one per signature.
 */
async function daoTransactions(endpoint: string, dao: string, from: number, to?: number): Promise<RawTransaction[]> {
  const all: RawTransaction[] = []
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
    all.push(...res.result.data)
    paginationToken = res.result.paginationToken ?? undefined
    if (!paginationToken || res.result.data.length < 100) break
  }
  return all
}

/**
 * Pass / fail / spot prices over a proposal's life, rebuilt from futarchy events (Anchor emit_cpi: the event is the
 * data of a self-invoked inner instruction, after an 8 byte tag). Raw JSON-RPC is used because web3.js cannot parse v1
 * transactions.
 * - The proposal's own transactions: launch, conditional swaps and finalization.
 * - The DAO's spot swaps while the proposal is live: during a proposal they trade through the pass and fail pools too,
 *   and most of the trading happens there, so reading only the proposal would leave the chart flat.
 */
async function load(endpoint: string, proposal: string, dao: string, baseDecimals: number, quoteDecimals: number): Promise<ProposalHistory> {
  const entry = cache.get(proposal) ?? { points: [], seen: new Set<string>() }
  // Cached right away so a failed refresh keeps what was already read
  cache.set(proposal, entry)
  const price = (p: Reserves) => Number(p.quoteReserves.toString()) / 10 ** quoteDecimals / (Number(p.baseReserves.toString()) / 10 ** baseDecimals)

  const decode = (tx?: RawTransaction | null) => {
    if (!tx?.meta || tx.meta.err || !tx.blockTime) return
    const t = tx.blockTime * 1000
    const keys = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])]

    for (const inner of tx.meta.innerInstructions ?? []) {
      for (const ix of inner.instructions) {
        if (keys[ix.programIdIndex] !== FUTARCHY) continue
        const data = Buffer.from(utils.bytes.bs58.decode(ix.data))
        if (data.length <= 16) continue
        const event = coder.decode(data.subarray(8).toString('base64'))
        if (!event) continue
        const d = event.data as FutarchyEvent
        if (d.proposal && d.proposal.toBase58() !== proposal) continue
        if (d.dao && d.dao.toBase58() !== dao) continue

        if (event.name === 'LaunchProposalEvent') entry.launchedAt = t
        if (event.name === 'FinalizeProposalEvent') entry.finalizedAt = t
        const pools = d.postAmmState?.state?.futarchy
        if (!pools) continue
        // Spot swaps only belong to this proposal while it is live
        const live = entry.launchedAt != null && t >= entry.launchedAt && (entry.finalizedAt == null || t <= entry.finalizedAt)
        if (PRICED_EVENTS.has(event.name) || (event.name === 'SpotSwapEvent' && live)) {
          entry.points.push({ t, pass: price(pools.pass), fail: price(pools.fail), spot: price(pools.spot) })
        }
      }
    }
  }

  // The proposal's own transactions: few, read one by one
  const sigs = await rpc<RpcResponse<Signature[]>>(endpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [proposal, { limit: 1000, until: entry.newest, commitment: 'confirmed' }],
  })
  if (!sigs.result) throw new Error(sigs.error?.message ?? 'getSignaturesForAddress failed')
  const todo = sigs.result.filter((s) => !s.err && !entry.seen.has(s.signature))
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    const txs = await rpc<RpcResponse<RawTransaction | null>[]>(
      endpoint,
      batch.map((s, id) => ({
        jsonrpc: '2.0',
        id,
        method: 'getTransaction',
        params: [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }],
      })),
    )
    batch.forEach((s) => entry.seen.add(s.signature))
    txs.forEach(({ result }) => decode(result))
  }
  if (sigs.result.length) entry.newest = sigs.result[0].signature

  // The DAO's swaps while the proposal is live, picked up from where the last refresh stopped
  if (entry.launchedAt != null) {
    const from = entry.daoCursor ?? Math.floor(entry.launchedAt / 1000)
    const to = entry.finalizedAt != null ? Math.ceil(entry.finalizedAt / 1000) : undefined
    if (to == null || from <= to) {
      for (const tx of await daoTransactions(endpoint, dao, from, to)) {
        const signature = tx.transaction.signatures[0]
        if (entry.seen.has(signature)) continue
        entry.seen.add(signature)
        decode(tx)
        if (tx.blockTime) entry.daoCursor = tx.blockTime
      }
    }
  }

  entry.points.sort((a, b) => a.t - b.t)
  cache.set(proposal, entry)
  return { points: [...entry.points], finalizedAt: entry.finalizedAt }
}

export function fetchProposalHistory(endpoint: string, proposal: string, dao: string, baseDecimals: number, quoteDecimals: number) {
  // Concurrent callers share one request so points are never added twice
  const running = inflight.get(proposal)
  if (running) return running
  const promise = load(endpoint, proposal, dao, baseDecimals, quoteDecimals).finally(() => inflight.delete(proposal))
  inflight.set(proposal, promise)
  return promise
}
