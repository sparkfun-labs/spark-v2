import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import type { Connection, PublicKey } from '@solana/web3.js'
import { fetchLaunch, type LaunchSnapshot } from './futardio'
import { usePolling } from './usePolling'

/** Open raises change by the second; closed ones are final, so they are read again only every 10 minutes */
const LIVE_TTL = 30_000
const FINAL_TTL = 600_000
const isOpen = (s?: LaunchSnapshot) => !s || s.state === 'initialized' || s.state === 'live'

type Slot = { data?: LaunchSnapshot; at: number; inflight?: Promise<LaunchSnapshot> }
// One read per launch shared by every card, carousel slide and stat showing it (the home page shows a launch up to 5 times)
const store = new Map<string, Slot>()

/** Launch state from the shared store, read from chain only when stale (or when `force`, after funding) */
export function getLaunch(connection: Connection, launchAddress: string, funder?: PublicKey, force = false): Promise<LaunchSnapshot> {
  const key = `${launchAddress}:${funder?.toBase58() ?? ''}`
  const slot = store.get(key) ?? { at: 0 }
  store.set(key, slot)
  const ttl = isOpen(slot.data) ? LIVE_TTL : FINAL_TTL
  if (!force && slot.data && Date.now() - slot.at < ttl - 1_000) return Promise.resolve(slot.data)
  if (slot.inflight) return slot.inflight
  slot.inflight = fetchLaunch(connection, launchAddress, funder)
    .then((data) => {
      slot.data = data
      slot.at = Date.now()
      return data
    })
    .finally(() => {
      slot.inflight = undefined
    })
  return slot.inflight
}

/** Live on-chain state of a launch, refreshed while the page is visible (every 30 s while the raise is open). */
export function useLaunch(launchAddress?: string) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [data, setData] = useState<LaunchSnapshot | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!launchAddress) return
      try {
        setData(await getLaunch(connection, launchAddress, publicKey ?? undefined, force))
      } catch (e) {
        console.warn('Could not load launch from chain', e)
      }
    },
    [connection, launchAddress, publicKey],
  )

  useEffect(() => {
    load()
  }, [load])
  const tick = useCallback(() => load(), [load])
  usePolling(tick, launchAddress ? (isOpen(data ?? undefined) ? LIVE_TTL : FINAL_TTL) : null)

  const refresh = useCallback(() => load(true), [load])
  return { data, refresh }
}
