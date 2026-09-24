import { AnchorProvider, Program } from '@coral-xyz/anchor'
import BN from 'bn.js'
import { getAssociatedTokenAddressSync, getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { ComputeBudgetProgram, PublicKey, SystemProgram, type Connection } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { IDL, type LaunchpadV7 } from './idl/launchpad_v7'

/** MetaDAO launchpad v0.7, used by Futardio launches. */
export const LAUNCHPAD_PROGRAM_ID = new PublicKey('moontUzsdepotRGe5xsfip7vLPTJnVuafqdUWexVnPM')

const readonlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T>(tx: T) => tx,
  signAllTransactions: async <T>(txs: T[]) => txs,
}

const getProgram = (connection: Connection, wallet: AnchorWallet = readonlyWallet) =>
  new Program<LaunchpadV7>(IDL, LAUNCHPAD_PROGRAM_ID, new AnchorProvider(connection, wallet, { commitment: 'confirmed' }))

export const getFundingRecordAddr = (launch: PublicKey, funder: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('funding_record'), launch.toBuffer(), funder.toBuffer()], LAUNCHPAD_PROGRAM_ID)[0]

const getEventAuthorityAddr = () =>
  PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], LAUNCHPAD_PROGRAM_ID)[0]

export type LaunchSnapshot = {
  state: string
  totalCommitted: number
  /** USDC actually accepted by the launch (set when the raise completes, 0 while live) */
  totalApproved: number
  minimumRaise: number
  endsAt?: string
  quoteMint: PublicKey
  quoteDecimals: number
  /** Futarchy DAO created when the raise completes */
  dao?: string
  funders?: number
  /** Wallets with a funding record on this launch */
  funderAddresses?: string[]
  yourCommitted?: number
}

const toUi = (v: BN, decimals: number) => Number(v.toString()) / 10 ** decimals

/** Parses a decimal string ("12.5") into base units without floating point errors. */
export function toBaseUnits(amount: string, decimals: number) {
  const [whole, frac = ''] = amount.split('.')
  const base = new BN(10).pow(new BN(decimals))
  return new BN(whole || '0').mul(base).add(new BN(frac.padEnd(decimals, '0').slice(0, decimals) || '0'))
}

export async function fetchLaunch(connection: Connection, launchAddress: string, funder?: PublicKey): Promise<LaunchSnapshot> {
  const program = getProgram(connection)
  const launch = new PublicKey(launchAddress)
  const acc = await program.account.launch.fetch(launch)
  const { decimals } = await getMint(connection, acc.quoteMint)

  const started = acc.unixTimestampStarted ? Number(acc.unixTimestampStarted.toString()) : undefined
  const snapshot: LaunchSnapshot = {
    state: Object.keys(acc.state)[0],
    totalCommitted: toUi(acc.totalCommittedAmount, decimals),
    totalApproved: toUi(acc.totalApprovedAmount, decimals),
    minimumRaise: toUi(acc.minimumRaiseAmount, decimals),
    endsAt: started ? new Date((started + acc.secondsForLaunch) * 1000).toISOString() : undefined,
    quoteMint: acc.quoteMint,
    quoteDecimals: decimals,
    dao: acc.dao?.toBase58(),
  }

  const [records, mine] = await Promise.allSettled([
    // FundingRecord layout: discriminator (8) + pda_bump (1) + funder (32) + launch (32)
    program.account.fundingRecord.all([{ memcmp: { offset: 41, bytes: launch.toBase58() } }]),
    funder ? program.account.fundingRecord.fetchNullable(getFundingRecordAddr(launch, funder)) : Promise.resolve(null),
  ])
  if (records.status === 'fulfilled') {
    snapshot.funders = records.value.length
    snapshot.funderAddresses = records.value.map((r) => r.account.funder.toBase58())
  }
  if (mine.status === 'fulfilled' && mine.value) snapshot.yourCommitted = toUi(mine.value.committedAmount, decimals)

  return snapshot
}

export async function getQuoteBalance(connection: Connection, quoteMint: PublicKey, owner: PublicKey) {
  try {
    const res = await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(quoteMint, owner, true))
    return res.value.uiAmount ?? 0
  } catch {
    return 0
  }
}

/** Commits USDC to a Futardio launch by calling the launchpad `fund` instruction. */
export async function fundLaunch({
  connection,
  wallet,
  launchAddress,
  amount,
}: {
  connection: Connection
  wallet: AnchorWallet
  launchAddress: string
  amount: string
}) {
  const program = getProgram(connection, wallet)
  const launch = new PublicKey(launchAddress)
  const acc = await program.account.launch.fetch(launch)

  if (!('live' in acc.state)) throw new Error('This raise is not live.')
  const started = Number(acc.unixTimestampStarted?.toString() ?? 0)
  if (Date.now() / 1000 > started + acc.secondsForLaunch) throw new Error('This raise has ended.')

  const { decimals } = await getMint(connection, acc.quoteMint)
  const baseUnits = toBaseUnits(amount, decimals)
  if (baseUnits.lten(0)) throw new Error('Enter an amount.')

  const funder = wallet.publicKey
  const funderQuoteAccount = getAssociatedTokenAddressSync(acc.quoteMint, funder, true)
  const balance = await getQuoteBalance(connection, acc.quoteMint, funder)
  if (balance < Number(amount)) throw new Error('Not enough USDC in this wallet.')

  return program.methods
    .fund(baseUnits)
    .accounts({
      launch,
      fundingRecord: getFundingRecordAddr(launch, funder),
      launchQuoteVault: acc.launchQuoteVault,
      funder,
      payer: funder,
      funderQuoteAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      eventAuthority: getEventAuthorityAddr(),
      program: LAUNCHPAD_PROGRAM_ID,
    })
    .preInstructions([ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })])
    .rpc()
}

export function describeError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (/reject|cancel/i.test(msg)) return 'Transaction cancelled in your wallet.'
  if (/InsufficientFunds|insufficient/i.test(msg)) return 'Not enough USDC (or SOL for fees) in this wallet.'
  if (/LaunchExpired/.test(msg)) return 'This raise has ended.'
  if (/InvalidLaunchState/.test(msg)) return 'This raise is not live.'
  if (/403|429|Failed to fetch/i.test(msg)) return 'The Solana RPC refused the request. Try again in a moment.'
  return msg
}
