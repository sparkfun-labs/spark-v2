import { BorshEventCoder, utils, type Idl } from '@coral-xyz/anchor'
import { IDL } from './idl/futarchy_v6'
import { FUTARCHY_PROGRAM_ID } from './daoProposals'

export type PricePoint = { t: number; pass: number; fail: number; spot: number }
export type ProposalHistory = { points: PricePoint[]; finalizedAt?: number }

type Reserves = { baseReserves: { toString(): string }; quoteReserves: { toString(): string } }
type FutarchyEvent = {
  proposal?: { toBase58(): string }
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
type RpcResponse<T> = { result?: T; error?: { message: string } }

const coder = new BorshEventCoder(IDL as Idl)
const FUTARCHY = FUTARCHY_PROGRAM_ID.toBase58()
/** Same limit as the /api/rpc proxy */
const BATCH = 20
const PRICED_EVENTS = new Set(['LaunchProposalEvent', 'ConditionalSwapEvent'])

type Entry = { newest?: string; points: PricePoint[]; finalizedAt?: number }
const cache = new Map<string, Entry>()
const inflight = new Map<string, Promise<ProposalHistory>>()

async function rpc<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  return res.json()
}

/**
 * Pass / fail / spot prices over a proposal's life, rebuilt from the futarchy events of its transactions.
 * Launch and every conditional swap emit the AMM state after the trade (Anchor emit_cpi: the event is the data of a
 * self-invoked inner instruction, after an 8 byte tag). Raw JSON-RPC is used because web3.js cannot parse v1 transactions.
 * Spot swaps are not attached to the proposal, so arbitrage in between trades shows up at the next point.
 */
async function load(endpoint: string, proposal: string, baseDecimals: number, quoteDecimals: number): Promise<ProposalHistory> {
  const entry = cache.get(proposal) ?? { points: [] }
  const sigs = await rpc<RpcResponse<{ signature: string; err: unknown }[]>>(endpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'getSignaturesForAddress',
    params: [proposal, { limit: 1000, until: entry.newest, commitment: 'confirmed' }],
  })
  if (!sigs.result) throw new Error(sigs.error?.message ?? 'getSignaturesForAddress failed')

  const price = (p: Reserves) => Number(p.quoteReserves.toString()) / 10 ** quoteDecimals / (Number(p.baseReserves.toString()) / 10 ** baseDecimals)
  const ok = sigs.result.filter((s) => !s.err)

  for (let i = 0; i < ok.length; i += BATCH) {
    const batch = ok.slice(i, i + BATCH).map((s, id) => ({
      jsonrpc: '2.0',
      id,
      method: 'getTransaction',
      params: [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 1, commitment: 'confirmed' }],
    }))
    const txs = await rpc<RpcResponse<RawTransaction | null>[]>(endpoint, batch)

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

          if (event.name === 'FinalizeProposalEvent') entry.finalizedAt = t
          const pools = d.postAmmState?.state?.futarchy
          if (pools && PRICED_EVENTS.has(event.name)) {
            entry.points.push({ t, pass: price(pools.pass), fail: price(pools.fail), spot: price(pools.spot) })
          }
        }
      }
    }
  }

  if (sigs.result.length) entry.newest = sigs.result[0].signature
  entry.points.sort((a, b) => a.t - b.t)
  cache.set(proposal, entry)
  return { points: [...entry.points], finalizedAt: entry.finalizedAt }
}

export function fetchProposalHistory(endpoint: string, proposal: string, baseDecimals: number, quoteDecimals: number) {
  // Concurrent callers share one request so points are never added twice
  const running = inflight.get(proposal)
  if (running) return running
  const promise = load(endpoint, proposal, baseDecimals, quoteDecimals).finally(() => inflight.delete(proposal))
  inflight.set(proposal, promise)
  return promise
}
