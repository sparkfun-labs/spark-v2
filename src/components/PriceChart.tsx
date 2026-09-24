import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { PricePoint } from '../lib/proposalHistory'
import { cx } from './ui'

const PAD = { top: 12, right: 58, bottom: 28, left: 0 }
const SERIES = [
  { key: 'pass', label: 'Pass', color: 'text-success' },
  { key: 'fail', label: 'Fail', color: 'text-error' },
  { key: 'spot', label: 'Spot', color: 'text-ink' },
] as const

const formatStamp = (t: number) =>
  new Date(t).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

export const formatChartPrice = (n: number) => `$${n < 0.01 ? n.toPrecision(3) : n.toFixed(4)}`

/**
 * Step chart of a proposal's pass, fail and spot prices. Prices only move on trades,
 * so each value holds until the next point, and the last one extends to `end`.
 */
export function PriceChart({
  points,
  end,
  live,
  marker,
  className,
}: {
  points: PricePoint[]
  end: number
  live?: boolean
  /** Vertical dashed line, e.g. when the TWAP starts counting */
  marker?: { t: number; label: string }
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 640, height: 260 })
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.max(260, entry.contentRect.width), height: Math.max(220, entry.contentRect.height) }),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!points.length) return null

  const t0 = points[0].t
  const t1 = Math.max(end, points[points.length - 1].t, t0 + 3_600_000)
  const values = points.flatMap((p) => [p.pass, p.fail, p.spot])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const margin = (max - min) * 0.2 || max * 0.05
  const lo = min - margin
  const hi = max + margin

  const innerW = width - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH
  const line = (key: 'pass' | 'fail' | 'spot') =>
    points.map((p, i) => (i === 0 ? `M${x(p.t)},${y(p[key])}` : `H${x(p.t)}V${y(p[key])}`)).join('') + `H${x(t1)}`

  const span = t1 - t0
  const formatTime = (t: number) =>
    new Date(t).toLocaleString('en-US', span < 36 * 3_600_000 ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' })
  const yTicks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * (i + 0.5)) / 4)
  const xTicks = [0, 1 / 3, 2 / 3, 1].map((f) => t0 + span * f)

  // Current value tags on the right axis, pushed apart so they never overlap
  const TAG_H = 16
  const tags = SERIES.map((s) => ({ ...s, value: points[points.length - 1][s.key], y: y(points[points.length - 1][s.key]) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < tags.length; i++) tags[i].y = Math.max(tags[i].y, tags[i - 1].y + TAG_H + 2)
  const overflow = tags[tags.length - 1].y + TAG_H / 2 - (PAD.top + innerH)
  if (overflow > 0) for (const t of tags) t.y -= overflow

  const active = hover == null ? null : ([...points].reverse().find((p) => p.t <= hover) ?? points[0])
  const shown = active ?? points[points.length - 1]

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = t0 + ((e.clientX - rect.left - PAD.left) / innerW) * span
    setHover(Math.min(t1, Math.max(t0, t)))
  }

  return (
    <div className={cx('flex h-full flex-col rounded-xl border border-line bg-surface px-3 py-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-2 text-xs font-medium">
              <span className={cx('h-2 w-2 rounded-full bg-current', s.color)} />
              <span className="text-muted uppercase">{s.label}</span>
              <span className={cx('font-mono', s.key !== 'spot' && s.color)}>{formatChartPrice(shown[s.key])}</span>
            </span>
          ))}
        </div>
        <span className="w-[116px] shrink-0 text-right font-mono text-xs whitespace-nowrap text-muted tabular-nums">{hover == null ? (live ? 'Now' : 'Final') : formatStamp(hover)}</span>
      </div>

      <div ref={ref} className="mt-3 min-h-[220px] flex-1">
      <svg
        width={width}
        height={height}
        className="block max-w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Pass, fail and spot price history"
      >
        <defs>
          <linearGradient id="pass-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v} className="text-muted">
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />
            {/* Hidden when a current price tag covers it */}
            {!tags.some((t) => Math.abs(t.y - y(v)) < TAG_H) && (
              <text x={width - 2} y={y(v) + 3} textAnchor="end" fill="currentColor" className="font-mono text-[10px]">
                {formatChartPrice(v)}
              </text>
            )}
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text
            key={t}
            x={x(t)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            fill="currentColor"
            className="font-mono text-[10px] text-muted"
          >
            {formatTime(t)}
          </text>
        ))}

        <path d={`${line('pass')}V${PAD.top + innerH}H${x(t0)}Z`} fill="url(#pass-area)" className="text-success" />
        <path d={line('fail')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-error" />
        <path d={line('pass')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-success" />
        {/* Spot is drawn last: it often sits exactly on the fail line */}
        <path d={line('spot')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.85" className="text-ink" />

        {tags.map((t) => (
          <g key={t.key} className={t.color}>
            <rect x={PAD.left + innerW + 4} y={t.y - TAG_H / 2} width={PAD.right - 4} height={TAG_H} rx="4" fill="currentColor" />
            <text
              x={PAD.left + innerW + 4 + (PAD.right - 4) / 2}
              y={t.y + 3.5}
              textAnchor="middle"
              fill={t.key === 'spot' ? 'var(--bg)' : '#fff'}
              className="font-mono text-[10px] font-medium"
            >
              {formatChartPrice(t.value)}
            </text>
          </g>
        ))}

        {marker && marker.t >= t0 && marker.t <= t1 && (
          <g className="text-brand">
            <line x1={x(marker.t)} x2={x(marker.t)} y1={PAD.top} y2={PAD.top + innerH} stroke="currentColor" strokeDasharray="4 3" strokeOpacity="0.8" />
            <text x={x(marker.t) + 4} y={PAD.top + 10} fill="currentColor" className="font-mono text-[10px]">
              {marker.label}
            </text>
          </g>
        )}

        {hover != null && active && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted)" strokeDasharray="2 3" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(active[s.key])} r="3.5" fill="currentColor" stroke="var(--card)" strokeWidth="1.5" className={s.color} />
            ))}
          </g>
        )}
      </svg>
      </div>
    </div>
  )
}
