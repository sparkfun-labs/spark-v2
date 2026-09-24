import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { WalletButton } from './WalletButton'
import { ThemeToggle } from './ThemeToggle'
import { cx } from './ui'

const NAV = [
  { to: '/ideas', label: 'Ideas' },
  { to: '/how-it-works', label: 'How it works' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cx(
        'sticky top-0 z-40 border-b transition-colors duration-300',
        scrolled || open ? 'border-line bg-bg/80 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto grid h-[72px] max-w-[1072px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
        <Link to="/" aria-label="Spark home" className="justify-self-start">
          <Logo className="h-7" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => cx('text-lg font-bold transition', isActive ? 'text-ink' : 'text-muted hover:text-ink')}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="col-start-3 flex items-center justify-self-end gap-3">
          <ThemeToggle />
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl bg-surface-hover md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M3.5 7h13M3.5 13h13" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 md:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="block border-b border-line py-3.5 text-lg font-bold">
              {n.label}
            </NavLink>
          ))}
          <div className="mt-4 sm:hidden">
            <WalletButton fullWidth />
          </div>
        </div>
      )}
    </header>
  )
}
