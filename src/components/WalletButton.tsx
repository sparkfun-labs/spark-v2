import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { shortAddress } from '../lib/links'
import { Button, ChevronDown, cx } from './ui'

export function WalletButton({ fullWidth }: { fullWidth?: boolean }) {
  const { publicKey, wallet, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const width = fullWidth ? 'w-full' : undefined

  if (!publicKey) {
    return (
      <Button className={width} onClick={() => setVisible(true)} disabled={connecting}>
        {connecting ? 'Connecting…' : 'Connect wallet'}
      </Button>
    )
  }

  return (
    <div className={cx('relative', width)} ref={ref}>
      <Button variant="secondary" className={cx('px-4', width)} onClick={() => setOpen((o) => !o)}>
        {wallet?.adapter.icon && <img src={wallet.adapter.icon} alt="" className="h-4 w-4 rounded" />}
        <span className="font-mono text-xs">{shortAddress(publicKey.toBase58())}</span>
        <ChevronDown className={cx('h-4 w-4 text-muted transition', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-line bg-card p-1.5 shadow-card">
          <MenuItem
            onClick={async () => {
              await navigator.clipboard.writeText(publicKey.toBase58())
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? 'Copied' : 'Copy address'}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false)
              setVisible(true)
            }}
          >
            Change wallet
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false)
              disconnect()
            }}
          >
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-muted hover:bg-surface-hover hover:text-ink">
      {children}
    </button>
  )
}
