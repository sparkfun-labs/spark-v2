import type { AnchorWallet } from '@solana/wallet-adapter-react'
import type { Connection, Transaction } from '@solana/web3.js'

const POLL_MS = 1_500
const RESEND_EVERY = 3 // polls

/**
 * Signs, sends and waits for a transaction by polling its status over HTTP until it is confirmed or its blockhash
 * expires. Anchor's default waits on a websocket subscription, which often misses the confirmation: the trade
 * went through but the page reported "not confirmed in 30 seconds".
 */
export async function sendAndConfirm(connection: Connection, wallet: AnchorWallet, tx: Transaction): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey
  const raw = (await wallet.signTransaction(tx)).serialize()
  const signature = await connection.sendRawTransaction(raw, { maxRetries: 0 })

  for (let poll = 1; ; poll++) {
    await new Promise((r) => setTimeout(r, POLL_MS))
    const status = (await connection.getSignatureStatuses([signature])).value[0]
    if (status?.err) throw new Error(`Transaction failed on-chain (${JSON.stringify(status.err)}).`)
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return signature
    if ((await connection.getBlockHeight('confirmed')) > lastValidBlockHeight) {
      throw new Error(`The transaction expired before it landed. Nothing was spent; try again. (${signature})`)
    }
    // Resent while waiting so a dropped packet doesn't leave it pending; the same signature can only land once
    if (poll % RESEND_EVERY === 0) connection.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {})
  }
}
