import { PublicKey, type Connection } from '@solana/web3.js'
import { IDEAS, type ProposalStatus } from '../data/ideas'

export const FUTARCHY_PROGRAM_ID = new PublicKey('FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq')
const SQUADS_PROGRAM_ID = new PublicKey('SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf')
const MEMO_PROGRAMS = new Set(['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'Memo1UhkJRfHyvLMcVucJwxXeuD95EyfpmJmd8o8pxs'])
const STATES: ProposalStatus[] = ['draft', 'pending', 'passed', 'failed', 'removed']
const TOKEN_PROGRAMS = new Set(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'])
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

/** SPL token transfer found in a proposal's transaction (Transfer or TransferChecked). */
type Transfer = { source: string; destination: string; amount: bigint; mint?: string; decimals?: number }

export type OnchainProposal = {
  address: string
  number: number
  status: ProposalStatus
  enqueuedAt?: string
  endsAt?: string
  teamSponsored: boolean
  /** Raw memo attached to the proposal's Squads transaction */
  memo?: string
  /** Memo without its ticker prefix and trailing link */
  title?: string
  /** Link found in the memo ("Full text: …") */
  fullTextUrl?: string
}

/*
 * Futarchy v0.6 Proposal account layout:
 * discriminator (8) | number u32 @8 | proposer (32) @12 | timestamp_enqueued i64 @44 | state enum @52
 * The Draft variant carries a u64, so the enum is 9 bytes for drafts and 1 byte otherwise. Then, from the dao field (D):
 * base_vault, quote_vault precede dao | pda_bump @D+32 | question (32) | duration_in_seconds u32 @D+65 |
 * squads_proposal (32) @D+69 | four conditional mints | is_team_sponsored bool @D+229
 */
const STATE_OFFSET = 52
const daoOffset = (stateTag: number) => (stateTag === 0 ? 125 : 117)

function decodeProposal(pubkey: PublicKey, data: Buffer) {
  const stateTag = data[STATE_OFFSET]
  const D = daoOffset(stateTag)
  const enqueued = Number(data.readBigInt64LE(44))
  const duration = data.readUInt32LE(D + 65)
  return {
    address: pubkey.toBase58(),
    number: data.readUInt32LE(8),
    status: STATES[stateTag] ?? 'removed',
    enqueuedAt: enqueued ? new Date(enqueued * 1000).toISOString() : undefined,
    endsAt: enqueued ? new Date((enqueued + duration) * 1000).toISOString() : undefined,
    teamSponsored: data[D + 229] === 1,
    squadsProposal: new PublicKey(data.subarray(D + 69, D + 101)),
  }
}

/**
 * The memo lives in the Squads vault transaction the proposal would execute. Token transfers are kept too,
 * to describe proposals created without a memo.
 * Squads v4 Proposal: discriminator (8) | multisig (32) | transaction_index u64 → VaultTransaction PDA.
 * VaultTransaction: discriminator, multisig, creator, index u64, bump, vault_index, vault_bump,
 * ephemeral_signer_bumps Vec<u8>, then the message (3 header bytes, account_keys Vec<Pubkey>,
 * instructions Vec<{ program_id_index u8, account_indexes Vec<u8>, data Vec<u8> }>).
 */
async function readTransaction(connection: Connection, squadsProposal: PublicKey): Promise<{ memo?: string; transfers: Transfer[] } | undefined> {
  const proposal = await connection.getAccountInfo(squadsProposal)
  if (!proposal) return undefined
  const multisig = new PublicKey(proposal.data.subarray(8, 40))
  const index = Buffer.from(proposal.data.subarray(40, 48))
  const [vaultTransaction] = PublicKey.findProgramAddressSync(
    [Buffer.from('multisig'), multisig.toBuffer(), Buffer.from('transaction'), index],
    SQUADS_PROGRAM_ID,
  )
  const vt = (await connection.getAccountInfo(vaultTransaction))?.data
  if (!vt) return undefined

  let o = 8 + 32 + 32 + 8 + 3
  o += 4 + vt.readUInt32LE(o) // ephemeral signer bumps
  o += 3 // message header
  const keyCount = vt.readUInt32LE(o)
  o += 4
  const keys: string[] = []
  for (let i = 0; i < keyCount; i++, o += 32) keys.push(new PublicKey(vt.subarray(o, o + 32)).toBase58())
  const instructionCount = vt.readUInt32LE(o)
  o += 4
  let memo: string | undefined
  const transfers: Transfer[] = []
  for (let i = 0; i < instructionCount; i++) {
    const program = keys[vt[o]]
    o += 1
    const accountCount = vt.readUInt32LE(o)
    o += 4
    const accounts = [...vt.subarray(o, o + accountCount)].map((k) => keys[k])
    o += accountCount
    const dataLength = vt.readUInt32LE(o)
    o += 4
    const data = vt.subarray(o, o + dataLength)
    o += dataLength
    if (MEMO_PROGRAMS.has(program)) memo ??= data.toString('utf8')
    // SPL token: Transfer = [3, amount u64] (source, destination); TransferChecked = [12, amount u64, decimals u8] (source, mint, destination)
    else if (TOKEN_PROGRAMS.has(program) && data[0] === 3 && data.length >= 9) {
      transfers.push({ source: accounts[0], destination: accounts[1], amount: data.readBigUInt64LE(1) })
    } else if (TOKEN_PROGRAMS.has(program) && data[0] === 12 && data.length >= 10) {
      transfers.push({ source: accounts[0], mint: accounts[1], destination: accounts[2], amount: data.readBigUInt64LE(1), decimals: data[9] })
    }
  }
  return { memo, transfers }
}

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`

/** "Send 1,000 USDC to 9eVX…UBhs": a readable title for proposals that only move tokens. */
async function describeTransfers(connection: Connection, transfers: Transfer[]) {
  if (!transfers.length) return undefined
  // Token account layout: mint (32) | owner (32) | amount; mint account: decimals u8 @44
  const tokenAccounts = await connection.getMultipleAccountsInfo(transfers.flatMap((t) => [new PublicKey(t.source), new PublicKey(t.destination)]))
  const mints = transfers.map((t, i) => t.mint ?? (tokenAccounts[2 * i] ? new PublicKey(tokenAccounts[2 * i]!.data.subarray(0, 32)).toBase58() : undefined))
  const mintInfos = await connection.getMultipleAccountsInfo(mints.map((m) => new PublicKey(m ?? USDC)))
  const symbols = new Map<string, string>([[USDC, 'USDC']])
  for (const idea of IDEAS) {
    if (idea.mint) symbols.set(idea.mint, idea.ticker)
    if (idea.relaunch) symbols.set(idea.relaunch.mint, idea.ticker)
  }

  return transfers
    .map((t, i) => {
      const destination = tokenAccounts[2 * i + 1]
      const owner = destination ? new PublicKey(destination.data.subarray(32, 64)).toBase58() : t.destination
      const decimals = t.decimals ?? mintInfos[i]?.data[44] ?? 0
      const amount = (Number(t.amount) / 10 ** decimals).toLocaleString('en-US', { maximumFractionDigits: 2 })
      const symbol = (mints[i] && symbols.get(mints[i]!)) ?? 'tokens'
      return `Send ${amount} ${symbol} to ${short(owner)}`
    })
    .join(', ')
}

/** "LFOWN: Do something. Full text: https://…" → { title: "Do something.", url } */
export function splitMemo(memo: string) {
  const url = memo.match(/https?:\/\/\S+/)?.[0]
  const title = memo
    .replace(/\s*Full text:\s*https?:\/\/\S+\s*$/i, '')
    .replace(url ?? '', '')
    .replace(/^\$?[A-Z0-9]{2,12}:\s*/, '')
    .trim()
  return { title: title || undefined, url }
}

/** All proposals of a futarchy DAO, newest first, with titles taken from their memos. */
export async function fetchDaoProposals(connection: Connection, dao: string): Promise<OnchainProposal[]> {
  const daoKey = new PublicKey(dao).toBase58()
  const [nonDrafts, drafts] = await Promise.all(
    [daoOffset(1), daoOffset(0)].map((offset) =>
      connection.getProgramAccounts(FUTARCHY_PROGRAM_ID, { filters: [{ memcmp: { offset, bytes: daoKey } }] }),
    ),
  )
  const decoded = [
    ...nonDrafts.filter((a) => a.account.data[STATE_OFFSET] !== 0),
    ...drafts.filter((a) => a.account.data[STATE_OFFSET] === 0),
  ].map((a) => decodeProposal(a.pubkey, a.account.data as Buffer))

  const proposals = await Promise.all(
    decoded.map(async ({ squadsProposal, ...p }) => {
      const tx = await readTransaction(connection, squadsProposal).catch(() => undefined)
      const memo = tx?.memo
      const { title, url } = memo ? splitMemo(memo) : { title: undefined, url: undefined }
      // Without a memo, describe what the proposal does on-chain
      const described = !title && tx ? await describeTransfers(connection, tx.transfers).catch(() => undefined) : undefined
      return { ...p, memo, title: title ?? described, fullTextUrl: url }
    }),
  )
  return proposals.sort((a, b) => b.number - a.number)
}
