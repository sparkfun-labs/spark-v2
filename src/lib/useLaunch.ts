import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchLaunch, type LaunchSnapshot } from './futardio'

/** Live on-chain state of a Futardio launch, refreshed every 30s. */
export function useLaunch(launchAddress?: string) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [data, setData] = useState<LaunchSnapshot | null>(null)

  const refresh = useCallback(async () => {
    if (!launchAddress) return
    try {
      setData(await fetchLaunch(connection, launchAddress, publicKey ?? undefined))
    } catch (e) {
      console.warn('Could not load launch from chain', e)
    }
  }, [connection, launchAddress, publicKey])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [refresh])

  return { data, refresh }
}
