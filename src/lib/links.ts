export const LINKS = {
  telegram: 'https://t.me/sparkdotfun',
  x: 'https://x.com/JustSparkIdeas',
  futardio: 'https://www.futard.io/',
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

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
