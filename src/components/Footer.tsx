import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { TelegramLogo, XLogo } from './ui'
import { LINKS } from '../lib/links'

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto flex max-w-[1072px] flex-col items-center justify-between gap-4 px-5 py-6 md:h-[72px] md:flex-row md:py-0">
        <Link to="/" aria-label="Spark home">
          <Logo className="h-7" />
        </Link>
        <p className="text-center text-xs font-medium text-muted">© {new Date().getFullYear()} Spark Ecosystem. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a href={LINKS.x} target="_blank" rel="noreferrer" aria-label="X" className="text-muted transition hover:text-ink">
            <XLogo />
          </a>
          <a href={LINKS.telegram} target="_blank" rel="noreferrer" aria-label="Telegram" className="text-muted transition hover:text-ink">
            <TelegramLogo />
          </a>
        </div>
      </div>
    </footer>
  )
}
