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
  transaction: { message: { accountKeys: string[] } }
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
/** Same limit as the /api/rpc proxy */
const BATCH = 20
/** Pages of 1,000 DAO signatures read back to find the start of an old proposal */
const MAX_DAO_PAGES = 5
const PRICED_EVENTS = new Set(['LaunchProposalEvent', 'ConditionalSwapEvent'])

type Entry = { newest?: string; daoNewest?: string; seen: Set<string>; points: PricePoint[]; launchedAt?: number; finalizedAt?: number }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<ProposalHistory>>()

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  return res.json()
}

/** Signatures of an address newer than `until`, walking back page by page while they are newer than `since` (ms). */
async function signatures(endpoint: string, address: string, until?: string, since = 0, maxPages = 1): Promise<Signature[]> {
  const all: Signature[] = []
  let before: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const res = await rpc<RpcResponse<Signature[]>>(endpoint, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 1000, until, before, commitment: 'confirmed' }],
    })
    if (!res.result) throw new Error(res.error?.message ?? 'getSignaturesForAddress failed')
    all.push(...res.result)
    const last = res.result.at(-1)
    if (res.result.length < 1000 || !last?.blockTime || last.blockTime * 1000 < since) break
    before = last.signature
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
  const price = (p: Reserves) => Number(p.quoteReserves.toString()) / 10 ** quoteDecimals / (Number(p.baseReserves.toString()) / 10 ** baseDecimals)

  const read = async (sigs: Signature[]) => {
    const todo = sigs.filter((s) => !s.err && !entry.seen.has(s.signature))
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

      for (const { result: tx } of txs) {
        if (!tx?.meta || tx.meta.err || !tx.blockTime) continue
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
    }
  }

  const own = await signatures(endpoint, proposal, entry.newest)
  await read(own)
  if (own.length) entry.newest = own[0].signature

  if (entry.launchedAt != null) {
    const end = entry.finalizedAt ?? Infinity
    const daoSigs = await signatures(endpoint, dao, entry.daoNewest, entry.launchedAt, entry.daoNewest ? 1 : MAX_DAO_PAGES)
    const inWindow = daoSigs.filter((s) => s.blockTime != null && s.blockTime * 1000 >= entry.launchedAt! && s.blockTime * 1000 <= end)
    await read(inWindow)
    if (daoSigs.length) entry.daoNewest = daoSigs[0].signature
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
