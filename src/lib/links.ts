export const LINKS = {
  telegram: 'https://t.me/sparkdotfun',
  /** Founders apply to the Spark Incubator through Mathis */
  mathis: 'https://t.me/Mathis_btc',
  backable: 'https://www.backable.biz/',
  x: 'https://x.com/JustSparkIdeas',
  metadaoPrograms: 'https://github.com/metaDAOproject/programs',
  sparkV1: 'https://justspark.fun/',
}

export const formatUsd = (n: number, compact = false) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n)

/** Number with thousands separators: 1,770.7 */
export const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export const formatPct = (n: number, digits = 1) => `${formatNumber(n, digits)}%`

/** Thousands separators for an amount being typed ("1000.5" → "1,000.5"), keeping a trailing dot or zeros */
export function groupDigits(raw: string) {
  const [int, frac] = raw.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? grouped : `${grouped || '0'}.${frac}`
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
