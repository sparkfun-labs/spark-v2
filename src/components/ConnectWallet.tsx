import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { ArrowUpRight } from './ui'

/*
 * Phone browsers (Safari, Chrome) never have a Solana wallet, unlike a desktop browser with an extension.
 * Phantom, Solflare and Backpack each have their own in-app browser that injects the wallet, so on a phone without
 * a wallet the site offers to reopen the current page there, where connecting works exactly as on desktop.
 * On Android, the Mobile Wallet Adapter (added by the wallet adapter) can also sign from Chrome directly.
 */

const MOBILE_WALLET_ADAPTER = 'Mobile Wallet Adapter'

/** A touch device whose browser says it's mobile (a desktop without an extension isn't one) */
export const isPhone = () =>
  typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** Deep links that open a page in each wallet's in-app browser. The page is read at tap time. */
const WALLET_APPS = [
  { name: 'Phantom', link: (page: string, ref: string) => `https://phantom.app/ul/browse/${page}?ref=${ref}` },
  { name: 'Solflare', link: (page: string, ref: string) => `https://solflare.com/ul/v1/browse/${page}?ref=${ref}` },
  { name: 'Backpack', link: (page: string, ref: string) => `https://backpack.app/ul/v1/browse/${page}?ref=${ref}` },
]

const ConnectContext = createContext<() => void>(() => {})

/** Opens the wallet picker: the usual modal, or on a phone without a wallet, the "open in your wallet app" sheet */
export const useConnectWallet = () => useContext(ConnectContext)

export function ConnectWalletProvider({ children }: { children: ReactNode }) {
  const { wallets, select } = useWallet()
  const { setVisible } = useWalletModal()
  const [sheet, setSheet] = useState(false)

  const injected = wallets.some((w) => w.adapter.name !== MOBILE_WALLET_ADAPTER && w.readyState === WalletReadyState.Installed)
  const mwa = wallets.find((w) => w.adapter.name === MOBILE_WALLET_ADAPTER && w.readyState !== WalletReadyState.Unsupported)

  const open = useCallback(() => {
    // Inside a wallet's browser (or on desktop) the wallet is in the page: the usual picker works
    if (!isPhone() || injected) setVisible(true)
    else setSheet(true)
  }, [injected, setVisible])

  useEffect(() => {
    if (!sheet) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sheet])

  const openIn = (app: (typeof WALLET_APPS)[number]) => {
    window.location.href = app.link(encodeURIComponent(window.location.href), encodeURIComponent(window.location.origin))
  }

  return (
    <ConnectContext.Provider value={open}>
      {children}
      {sheet && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm sm:p-5" onClick={() => setSheet(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-wallet-title"
            className="w-full max-w-md rounded-3xl border border-line bg-card p-6 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="connect-wallet-title" className="text-lg font-bold">
                  Connect a wallet
                </p>
                <p className="mt-1 text-sm text-muted">Phone browsers don’t have a Solana wallet. Open this page in your wallet app:</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-ink">
                ✕
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {WALLET_APPS.map((app) => (
                <button
                  key={app.name}
                  type="button"
                  onClick={() => openIn(app)}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-left font-medium transition hover:bg-surface-hover"
                >
                  Open in {app.name}
                  <ArrowUpRight className="h-4 w-4 text-muted" />
                </button>
              ))}
            </div>

            {mwa && (
              <button
                type="button"
                onClick={() => {
                  setSheet(false)
                  select(mwa.adapter.name)
                }}
                className="mt-4 w-full text-center text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Or use a wallet installed on this phone
              </button>
            )}
          </div>
        </div>
      )}
    </ConnectContext.Provider>
  )
}
