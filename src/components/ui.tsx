import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatUsd } from '../lib/links'
import { useInView } from '../lib/useInView'
import { CountUp } from './CountUp'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Icons (paths exported from the Spark Figma file) ---------- */

type IconProps = { className?: string }

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const ArrowRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" {...stroke}>
    <path d="M3.333 8h9.334M8 12.667 12.667 8 8 3.333" />
  </svg>
)

export const ArrowUpRight = ({ className = 'h-3.5 w-3.5' }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" {...stroke}>
    <path d="M4.667 11.333 11.333 4.667M4.667 4.667h6.666v6.666" />
  </svg>
)

export const ChevronDown = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" {...stroke}>
    <path d="M4 6l4 4 4-4" />
  </svg>
)

export const Sparkle = ({ className = 'h-3 w-3' }: IconProps) => (
  <svg viewBox="0 0 12 12" className={className} aria-hidden="true" {...stroke} strokeWidth={1.4}>
    <path d="M5.508 1.407a.5.5 0 0 1 .983 0l.526 2.779a1 1 0 0 0 .797.797l2.779.526a.5.5 0 0 1 0 .982l-2.779.526a1 1 0 0 0-.797.797l-.526 2.779a.5.5 0 0 1-.982 0l-.526-2.779a1 1 0 0 0-.797-.797l-2.779-.526a.5.5 0 0 1 0-.982l2.779-.526a1 1 0 0 0 .797-.797l.525-2.779Z" />
  </svg>
)

export const Coins = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
    <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48M15 6h1v4M6.134 14.768l.866-.5 2 3.464M22 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
  </svg>
)

export const Pickaxe = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
    <path d="M14 13l-8.381 8.38a2.12 2.12 0 1 1-3.001-3L11 9.999M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z" />
  </svg>
)

export const ChartLine = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16M19 9l-5 5-4-4-3 3" />
  </svg>
)

export const ThumbsUp = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" {...stroke} strokeWidth={1.5}>
    <path d="M4.667 6.667v8M10 3.92l-.667 2.747h3.887a1.333 1.333 0 0 1 1.28 1.706l-1.553 5.334a1.333 1.333 0 0 1-1.28.96h-9a1.333 1.333 0 0 1-1.334-1.334V8a1.333 1.333 0 0 1 1.334-1.333h1.84a1.333 1.333 0 0 0 1.193-.74L8 1.333A2.087 2.087 0 0 1 10 3.92Z" />
  </svg>
)

export const Github = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 18.5 20" className={className} aria-hidden="true" {...stroke} strokeWidth={1.6}>
    <path d="M13 19v-3c0-.63.15-1.96-.5-2.5 1.39-.13 2.48-.58 3.5-1.5s1.5-2.31 1.5-4.5c0-1.5-.25-2.5-1-3.5.29-.78.34-2 0-3-1.56 0-2.97 1.07-3.5 1.5-.39-.1-1.33-.5-3-.5s-2.61.4-3 .5C6.47 2.07 5.06 1 3.5 1c-.34 1-.29 2.22 0 3-.75 1-1 2-1 3.5 0 2.19.48 3.58 1.5 4.5s2.11 1.37 3.5 1.5c-.65.54-.5 1.87-.5 2.5v3M7 17c-1.41 0-2.84-.56-3.69-1.19-.84-.63-1.09-1.66-2.31-2.31" />
  </svg>
)

export const XLogo = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M20 20 12.179 8.344l.013.01L19.244 0h-2.357l-5.744 6.8L6.58 0H.4l7.302 10.883L0 20h2.357l6.386-7.566L13.82 20H20ZM5.647 1.818 16.62 18.182h-1.867L3.77 1.818h1.876Z"
    />
  </svg>
)

export const TelegramLogo = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M19.962 2.385C20.249.848 18.871-.429 17.535.137L1.158 7.068c-1.492.632-1.558 2.917-.106 3.652l3.566 1.803 1.697 6.505c.088.338.333.6.643.688.31.088.64-.01.867-.259l2.614-2.863 3.661 3.008c1.063.873 2.593.237 2.86-1.188l3.002-16.029ZM1.81 8.918 18.188 1.987l-3.001 16.028-4.29-3.524a.84.84 0 0 0-1.183.092l-1.12 1.226.337-2.026 6.59-7.22c.321-.351.355-.908.08-1.303-.276-.395-.775-.506-1.169-.259l-9.101 5.697L1.81 8.918Zm4.63 3.37.55 2.105.21-1.27a.97.97 0 0 1 .25-.524l2.01-2.201-3.02 1.89Z"
    />
  </svg>
)

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'solid' | 'secondary' | 'dark' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-gradient text-white hover:brightness-105 active:brightness-95',
  solid: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-surface-hover text-ink hover:bg-ink/10',
  dark: 'bg-ink text-bg hover:bg-ink/85',
  ghost: 'text-muted hover:bg-surface-hover hover:text-ink',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-7 text-base',
}

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  to?: string
  href?: string
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export function Button({ variant = 'primary', size = 'md', to, href, className, children, ...rest }: ButtonProps) {
  const cls = cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}

/* ---------- Badges ---------- */

type BadgeTone = 'brand' | 'neutral' | 'success'

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand/10 text-brand-dark',
  neutral: 'bg-surface-hover text-muted',
  success: 'bg-success/10 text-success',
}

export function Badge({ tone = 'neutral', dot, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-xs leading-none font-medium uppercase',
        BADGE_TONES[tone],
      )}
    >
      {dot && <LiveDot />}
      {children}
    </span>
  )
}

export function LiveDot() {
  return <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand" />
}

/** Rounded label used above hero titles ("LIVE ON SOLANA", "HOW IT WORKS"). */
export function Pill({ children, dot }: { children: ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs leading-none font-medium uppercase">
      {dot && <LiveDot />}
      {children}
    </span>
  )
}

/* ---------- Surfaces ---------- */

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-card shadow-card', className)} style={style}>
      {children}
    </div>
  )
}

/** Soft brand-colored light used as page atmosphere. */
export function Glow({ className }: { className: string }) {
  return <div aria-hidden className={cx('glow pointer-events-none absolute -z-10 rounded-full', className)} />
}

/* ---------- Typography ---------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-xs font-medium tracking-wide text-brand uppercase', className)}>{children}</p>
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('reveal mx-auto flex max-w-2xl flex-col items-center gap-2 text-center', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl leading-tight font-bold text-balance md:text-[32px]">{title}</h2>
      {description && <p className="mt-2 text-pretty text-muted">{description}</p>}
    </div>
  )
}

/* ---------- Data ---------- */

export function StatTile({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-1 rounded bg-surface p-1.5 text-xs', className)}>
      <span className="font-medium text-muted uppercase">{label}</span>
      <span className="font-mono">{typeof value === 'string' || typeof value === 'number' ? <CountUp value={value} /> : value}</span>
    </div>
  )
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface px-3 py-6 text-center">
      <p className="text-[clamp(1.5rem,2.4vw,2rem)] leading-none font-bold whitespace-nowrap tabular-nums">
        {typeof value === 'string' || typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      <p className="text-xs font-medium text-muted uppercase">{label}</p>
    </div>
  )
}

export function ProgressBar({ pct, className, animate = true }: { pct: number; className?: string; animate?: boolean }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  const inView = !animate || seen
  return (
    <div ref={ref} className={cx('h-1 overflow-hidden rounded-full bg-surface-hover', className)}>
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: inView ? `${Math.min(Math.max(pct, 0), 100)}%` : '0%' }}
      />
    </div>
  )
}

export function RaiseProgress({ raised, goal, className }: { raised: number; goal: number; className?: string }) {
  const pct = goal > 0 ? (raised / goal) * 100 : 0
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-3">
        <p className="text-2xl leading-none font-bold tabular-nums">
          <CountUp value={formatUsd(raised)} />
        </p>
        <p className="text-xs font-medium text-brand">{pct.toFixed(1)}%</p>
      </div>
      <ProgressBar pct={pct} className="mt-3" />
      <p className="mt-2 font-mono text-xs text-muted">of {formatUsd(goal)} goal</p>
    </div>
  )
}
