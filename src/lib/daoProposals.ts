import { PublicKey, type Connection } from '@solana/web3.js'
import type { ProposalStatus } from '../data/ideas'

export const FUTARCHY_PROGRAM_ID = new PublicKey('FUTARELBfJfQ8RDGhg1wdhddq1odMAJUePHFuBYfUxKq')
const SQUADS_PROGRAM_ID = new PublicKey('SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf')
const MEMO_PROGRAMS = new Set(['MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', 'Memo1UhkJRfHyvLMcVucJwxXeuD95EyfpmJmd8o8pxs'])
const STATES: ProposalStatus[] = ['draft', 'pending', 'passed', 'failed', 'removed']

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
 * The memo lives in the Squads vault transaction the proposal would execute.
 * Squads v4 Proposal: discriminator (8) | multisig (32) | transaction_index u64 → VaultTransaction PDA.
 * VaultTransaction: discriminator, multisig, creator, index u64, bump, vault_index, vault_bump,
 * ephemeral_signer_bumps Vec<u8>, then the message (3 header bytes, account_keys Vec<Pubkey>,
 * instructions Vec<{ program_id_index u8, account_indexes Vec<u8>, data Vec<u8> }>).
 */
async function readMemo(connection: Connection, squadsProposal: PublicKey) {
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
  for (let i = 0; i < instructionCount; i++) {
    const program = keys[vt[o]]
    o += 1
    o += 4 + vt.readUInt32LE(o) // account indexes
    const dataLength = vt.readUInt32LE(o)
    o += 4
    if (MEMO_PROGRAMS.has(program)) return vt.subarray(o, o + dataLength).toString('utf8')
    o += dataLength
  }
  return undefined
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
      const memo = await readMemo(connection, squadsProposal).catch(() => undefined)
      const { title, url } = memo ? splitMemo(memo) : { title: undefined, url: undefined }
      return { ...p, memo, title, fullTextUrl: url }
    }),
  )
  return proposals.sort((a, b) => b.number - a.number)
}
