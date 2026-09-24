import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'

// HTTP goes through our own /api/rpc proxy so the Helius key never reaches the browser.
// Websocket subscriptions (transaction confirmations) use a keyless public endpoint.
const WS_ENDPOINT = 'wss://solana-rpc.publicnode.com'

export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => `${window.location.origin}/api/rpc`, [])
  const config = useMemo(() => ({ commitment: 'confirmed' as const, wsEndpoint: WS_ENDPOINT }), [])

  // Phantom, Solflare, Backpack etc. register themselves through the Wallet Standard,
  // so no explicit adapters are needed.
  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
