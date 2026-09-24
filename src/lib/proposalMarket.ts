import { AnchorProvider, Program } from '@coral-xyz/anchor'
import BN from 'bn.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { ComputeBudgetProgram, PublicKey, Transaction, type Connection, type TransactionInstruction } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { IDL as FUTARCHY_IDL, type Futarchy } from './idl/futarchy_v6'
import { IDL as VAULT_IDL, type ConditionalVault } from './idl/conditional_vault_v4'
import { FUTARCHY_PROGRAM_ID } from './daoProposals'
import { toBaseUnits } from './futardio'

/** MetaDAO conditional vault v0.4: splits USDC / tokens into pass and fail tokens. */
export const VAULT_PROGRAM_ID = new PublicKey('VLTX1ishMBbcX3rdBWGssxawAo1Q2X2qxYFYqiGodVg')

// futarchy lib.rs: PROTOCOL_TAKER_FEE_BPS = 50, LP_TAKER_FEE_BPS = 0
const TAKER_FEE_BPS = 50n
const MAX_BPS = 10_000n

export type Side = 'pass' | 'fail'
export type SwapType = 'buy' | 'sell'

type Pool = { base: bigint; quote: bigint; price: number }
type Oracle = { aggregator: BN; lastUpdatedTimestamp: BN; createdAtTimestamp: BN; lastObservation: BN; startDelaySeconds: number }
type RawPool = { baseReserves: BN; quoteReserves: BN; oracle: Oracle }

export type ProposalMarket = {
  dao: PublicKey
  proposal: PublicKey
  question: PublicKey
  baseMint: PublicKey
  quoteMint: PublicKey
  baseDecimals: number
  quoteDecimals: number
  baseVault: PublicKey
  quoteVault: PublicKey
  /** pass/fail conditional mints, in vault order (index 0 = fail, 1 = pass) */
  mints: { passBase: PublicKey; failBase: PublicKey; passQuote: PublicKey; failQuote: PublicKey }
  pools: { spot: Pool; pass?: Pool; fail?: Pool }
  /** The market is tradable only while the proposal is pending */
  pending: boolean
  /** Set once the question is resolved: which side pays out */
  resolved?: Side
  /** Only while the pass and fail pools exist */
  twap?: {
    /** ms timestamp: before it, trades move prices but do not count towards the TWAP */
    startsAt: number
    /** Current TWAPs, undefined until the oracle has been updated after the start */
    pass?: number
    fail?: number
    /** Pass TWAP must beat fail TWAP by this many bps (team sponsored proposals have their own, possibly negative, threshold) */
    thresholdBps: number
  }
}

export type Positions = {
  quote: number
  base: number
  passQuote: number
  failQuote: number
  passBase: number
  failBase: number
}

const readonlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T>(tx: T) => tx,
  signAllTransactions: async <T>(txs: T[]) => txs,
}

function programs(connection: Connection, wallet: AnchorWallet = readonlyWallet) {
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return {
    provider,
    futarchy: new Program<Futarchy>(FUTARCHY_IDL, FUTARCHY_PROGRAM_ID, provider),
    vault: new Program<ConditionalVault>(VAULT_IDL, VAULT_PROGRAM_ID, provider),
  }
}

const eventAuthority = (programId: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], programId)[0]

const ata = (mint: PublicKey, owner: PublicKey) => getAssociatedTokenAddressSync(mint, owner, true)

function toPool(p: { baseReserves: BN; quoteReserves: BN }, baseDecimals: number, quoteDecimals: number): Pool {
  const base = BigInt(p.baseReserves.toString())
  const quote = BigInt(p.quoteReserves.toString())
  const price = base > 0n ? Number(quote) / 10 ** quoteDecimals / (Number(base) / 10 ** baseDecimals) : 0
  return { base, quote, price }
}

/** Reads the DAO's FutarchyAmm pools and the proposal's conditional vaults. */
export async function fetchProposalMarket(connection: Connection, dao: string, proposal: string): Promise<ProposalMarket> {
  const { futarchy, vault } = programs(connection)
  const [d, p] = await Promise.all([futarchy.account.dao.fetch(dao), futarchy.account.proposal.fetch(proposal)])
  const [baseVault, quoteVault, question] = await Promise.all([
    vault.account.conditionalVault.fetch(p.baseVault),
    vault.account.conditionalVault.fetch(p.quoteVault),
    vault.account.question.fetch(p.question),
  ])

  const state = d.amm.state as { futarchy?: { spot: RawPool; pass: RawPool; fail: RawPool }; spot?: { spot: RawPool } }
  const bd = baseVault.decimals
  const qd = quoteVault.decimals
  const pools = state.futarchy
    ? { spot: toPool(state.futarchy.spot, bd, qd), pass: toPool(state.futarchy.pass, bd, qd), fail: toPool(state.futarchy.fail, bd, qd) }
    : { spot: toPool(state.spot!.spot, bd, qd) }

  const now = Math.floor(Date.now() / 1000)
  // futarchy Pool::get_twap: (aggregator + last_observation × unaccumulated seconds) / seconds since the TWAP start
  const twapOf = (o: Oracle) => {
    const start = Number(o.createdAtTimestamp.toString()) + o.startDelaySeconds
    const lastUpdated = Number(o.lastUpdatedTimestamp.toString())
    if (lastUpdated <= start || now <= start) return undefined
    const total = BigInt(o.aggregator.toString()) + BigInt(o.lastObservation.toString()) * BigInt(now - lastUpdated)
    // Observations are quote base units per base unit, scaled by 1e12
    return (Number(total / BigInt(now - start)) / 1e12) * 10 ** (bd - qd)
  }
  const twap = state.futarchy && {
    startsAt: (Number(state.futarchy.pass.oracle.createdAtTimestamp.toString()) + state.futarchy.pass.oracle.startDelaySeconds) * 1000,
    pass: twapOf(state.futarchy.pass.oracle),
    fail: twapOf(state.futarchy.fail.oracle),
    thresholdBps: p.isTeamSponsored ? d.teamSponsoredPassThresholdBps : d.passThresholdBps,
  }

  // payout_numerators follow the question outcomes: [FAIL, PASS]
  const [failPayout, passPayout] = question.payoutNumerators
  const resolved = question.payoutDenominator > 0 ? (passPayout > failPayout ? 'pass' : 'fail') : undefined

  return {
    dao: new PublicKey(dao),
    proposal: new PublicKey(proposal),
    question: p.question,
    baseMint: d.baseMint,
    quoteMint: d.quoteMint,
    baseDecimals: bd,
    quoteDecimals: qd,
    baseVault: p.baseVault,
    quoteVault: p.quoteVault,
    mints: { passBase: p.passBaseMint, failBase: p.failBaseMint, passQuote: p.passQuoteMint, failQuote: p.failQuoteMint },
    pools,
    pending: 'pending' in p.state && !!state.futarchy,
    resolved,
    twap,
  }
}

export async function fetchPositions(connection: Connection, m: ProposalMarket, owner: PublicKey): Promise<Positions> {
  const mints = [m.quoteMint, m.baseMint, m.mints.passQuote, m.mints.failQuote, m.mints.passBase, m.mints.failBase]
  const decimals = [m.quoteDecimals, m.baseDecimals, m.quoteDecimals, m.quoteDecimals, m.baseDecimals, m.baseDecimals]
  const infos = await connection.getMultipleAccountsInfo(mints.map((mint) => ata(mint, owner)))
  // SPL token account: mint (32) | owner (32) | amount u64 @64
  const [quote, base, passQuote, failQuote, passBase, failBase] = infos.map((info, i) =>
    info ? Number(info.data.readBigUInt64LE(64)) / 10 ** decimals[i] : 0,
  )
  return { quote, base, passQuote, failQuote, passBase, failBase }
}

/** Constant product quote, same math as futarchy `Pool::swap` (before the AMM's own arbitrage, which only adds to it). */
export function quoteSwap(m: ProposalMarket, side: Side, swapType: SwapType, amount: string) {
  const pool = m.pools[side]
  const inDecimals = swapType === 'buy' ? m.quoteDecimals : m.baseDecimals
  const outDecimals = swapType === 'buy' ? m.baseDecimals : m.quoteDecimals
  const input = BigInt(toBaseUnits(amount || '0', inDecimals).toString())
  if (!pool || input <= 0n) return null

  const afterFee = (input * (MAX_BPS - TAKER_FEE_BPS)) / MAX_BPS
  const [inReserve, outReserve] = swapType === 'buy' ? [pool.quote, pool.base] : [pool.base, pool.quote]
  const output = (afterFee * outReserve) / (inReserve + afterFee)

  const inUi = Number(input) / 10 ** inDecimals
  const outUi = Number(output) / 10 ** outDecimals
  const avgPrice = swapType === 'buy' ? inUi / outUi : outUi / inUi
  return { input, output, outUi, avgPrice, impact: pool.price ? Math.abs(avgPrice / pool.price - 1) : 0 }
}

export function toTransaction(instructions: TransactionInstruction[]) {
  return new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
    ...instructions,
  )
}

const send = (connection: Connection, wallet: AnchorWallet, instructions: TransactionInstruction[]) =>
  programs(connection, wallet).provider.sendAndConfirm(toTransaction(instructions))

/** split / merge / redeem share the same accounts; remaining accounts are the conditional mints then the user's accounts. */
function vaultAccounts(m: ProposalMarket, kind: 'base' | 'quote', user: PublicKey) {
  const vault = kind === 'base' ? m.baseVault : m.quoteVault
  const underlying = kind === 'base' ? m.baseMint : m.quoteMint
  const conditional = kind === 'base' ? [m.mints.failBase, m.mints.passBase] : [m.mints.failQuote, m.mints.passQuote]
  return {
    accounts: {
      question: m.question,
      vault,
      vaultUnderlyingTokenAccount: ata(underlying, vault),
      authority: user,
      userUnderlyingTokenAccount: ata(underlying, user),
      tokenProgram: TOKEN_PROGRAM_ID,
      eventAuthority: eventAuthority(VAULT_PROGRAM_ID),
      program: VAULT_PROGRAM_ID,
    },
    remaining: [...conditional, ...conditional.map((mint) => ata(mint, user))].map((pubkey) => ({ pubkey, isWritable: true, isSigner: false })),
    conditionalMints: conditional,
  }
}

/**
 * Trades a proposal market. Buying spends pass (or fail) USDC, selling spends pass (or fail) tokens.
 * Whatever the wallet lacks is first split from its plain USDC / tokens, exactly like the MetaDAO app does.
 */
export async function buildTrade({
  connection,
  wallet,
  market: m,
  side,
  swapType,
  amount,
  slippageBps = 200,
}: {
  connection: Connection
  wallet: AnchorWallet
  market: ProposalMarket
  side: Side
  swapType: SwapType
  amount: string
  slippageBps?: number
}) {
  if (!m.pending) throw new Error('This market is closed.')
  const quote = quoteSwap(m, side, swapType, amount)
  if (!quote || quote.output <= 0n) throw new Error('Enter an amount.')

  const user = wallet.publicKey
  const { futarchy, vault } = programs(connection, wallet)
  const positions = await fetchPositions(connection, m, user)
  const kind = swapType === 'buy' ? 'quote' : 'base'
  const decimals = kind === 'quote' ? m.quoteDecimals : m.baseDecimals
  const held = kind === 'quote' ? (side === 'pass' ? positions.passQuote : positions.failQuote) : side === 'pass' ? positions.passBase : positions.failBase
  const plain = kind === 'quote' ? positions.quote : positions.base

  const heldUnits = BigInt(Math.round(held * 10 ** decimals))
  const toSplit = quote.input > heldUnits ? quote.input - heldUnits : 0n
  if (Number(toSplit) / 10 ** decimals > plain + 1e-9) {
    throw new Error(kind === 'quote' ? 'Not enough USDC in this wallet.' : 'Not enough tokens in this wallet.')
  }

  const [inMint, outMint] =
    swapType === 'buy'
      ? side === 'pass' ? [m.mints.passQuote, m.mints.passBase] : [m.mints.failQuote, m.mints.failBase]
      : side === 'pass' ? [m.mints.passBase, m.mints.passQuote] : [m.mints.failBase, m.mints.failQuote]

  // Only create the token accounts this trade touches and the wallet lacks: the transaction is close to the 1232 byte limit
  const v = vaultAccounts(m, kind, user)
  const needed = toSplit > 0n ? [...v.conditionalMints, outMint] : [inMint, outMint]
  const existing = await connection.getMultipleAccountsInfo(needed.map((mint) => ata(mint, user)))
  const instructions: TransactionInstruction[] = needed
    .filter((_, i) => !existing[i])
    .map((mint) => createAssociatedTokenAccountIdempotentInstruction(user, ata(mint, user), user, mint))

  if (toSplit > 0n) {
    instructions.push(await vault.methods.splitTokens(new BN(toSplit.toString())).accounts(v.accounts).remainingAccounts(v.remaining).instruction())
  }

  const minOutput = (quote.output * (MAX_BPS - BigInt(slippageBps))) / MAX_BPS

  instructions.push(
    await futarchy.methods
      .conditionalSwap({
        market: side === 'pass' ? { pass: {} } : { fail: {} },
        swapType: swapType === 'buy' ? { buy: {} } : { sell: {} },
        inputAmount: new BN(quote.input.toString()),
        minOutputAmount: new BN(minOutput.toString()),
      } as never)
      .accounts({
        dao: m.dao,
        ammBaseVault: ata(m.baseMint, m.dao),
        ammQuoteVault: ata(m.quoteMint, m.dao),
        proposal: m.proposal,
        ammPassBaseVault: ata(m.mints.passBase, m.dao),
        ammPassQuoteVault: ata(m.mints.passQuote, m.dao),
        ammFailBaseVault: ata(m.mints.failBase, m.dao),
        ammFailQuoteVault: ata(m.mints.failQuote, m.dao),
        trader: user,
        userInputAccount: ata(inMint, user),
        userOutputAccount: ata(outMint, user),
        baseVault: m.baseVault,
        baseVaultUnderlyingTokenAccount: ata(m.baseMint, m.baseVault),
        quoteVault: m.quoteVault,
        quoteVaultUnderlyingTokenAccount: ata(m.quoteMint, m.quoteVault),
        passBaseMint: m.mints.passBase,
        failBaseMint: m.mints.failBase,
        passQuoteMint: m.mints.passQuote,
        failQuoteMint: m.mints.failQuote,
        conditionalVaultProgram: VAULT_PROGRAM_ID,
        vaultEventAuthority: eventAuthority(VAULT_PROGRAM_ID),
        question: m.question,
        tokenProgram: TOKEN_PROGRAM_ID,
        eventAuthority: eventAuthority(FUTARCHY_PROGRAM_ID),
        program: FUTARCHY_PROGRAM_ID,
      })
      .instruction(),
  )

  return instructions
}

export async function tradeProposal(args: Parameters<typeof buildTrade>[0]) {
  return send(args.connection, args.wallet, await buildTrade(args))
}

/**
 * Turns conditional tokens back into USDC and tokens: merges matching pass + fail pairs while the market is open,
 * or redeems the winning side once the proposal is finalized.
 */
export async function buildWithdraw({ connection, wallet, market: m }: { connection: Connection; wallet: AnchorWallet; market: ProposalMarket }) {
  const user = wallet.publicKey
  const { vault } = programs(connection, wallet)
  const pos = await fetchPositions(connection, m, user)
  const instructions: TransactionInstruction[] = []

  for (const kind of ['quote', 'base'] as const) {
    const decimals = kind === 'quote' ? m.quoteDecimals : m.baseDecimals
    const [pass, fail] = kind === 'quote' ? [pos.passQuote, pos.failQuote] : [pos.passBase, pos.failBase]
    const v = vaultAccounts(m, kind, user)
    const underlying = kind === 'quote' ? m.quoteMint : m.baseMint
    const createUnderlying = createAssociatedTokenAccountIdempotentInstruction(user, ata(underlying, user), user, underlying)

    if (m.resolved) {
      if (pass > 0 || fail > 0) {
        instructions.push(createUnderlying, await vault.methods.redeemTokens().accounts(v.accounts).remainingAccounts(v.remaining).instruction())
      }
    } else {
      const pair = Math.floor(Math.min(pass, fail) * 10 ** decimals)
      if (pair > 0) {
        instructions.push(createUnderlying, await vault.methods.mergeTokens(new BN(pair)).accounts(v.accounts).remainingAccounts(v.remaining).instruction())
      }
    }
  }

  if (!instructions.length) throw new Error(m.resolved ? 'Nothing to redeem.' : 'No matching pass and fail tokens to merge.')
  return instructions
}

export async function withdrawPositions(args: Parameters<typeof buildWithdraw>[0]) {
  return send(args.connection, args.wallet, await buildWithdraw(args))
}
