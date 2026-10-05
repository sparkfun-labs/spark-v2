import type { Idea } from '../data/ideas'
import { useTokenAth } from './useTokenAth'
import { useTokenMarket } from './useTokenMarket'

/**
 * Token an idea's returns are measured on, and the price backers paid for it:
 * the relaunched token when a Season 1 idea was relaunched, otherwise the idea's own token.
 */
export function returnsSource(idea: Idea) {
  if (idea.relaunch) return { mint: idea.relaunch.mint, entry: idea.relaunch.entryPrice, snapshot: idea.relaunch.token, relaunched: true }
  const entry = idea.entryPrice ?? idea.icoPrice
  return idea.mint && entry ? { mint: idea.mint, entry, snapshot: idea.token, relaunched: false } : null
}

export type IdeaReturns = {
  /** Current token price in USD */
  price: number
  /** All-time high as a multiple of the entry price */
  peak: number
  /** Current price as a multiple of the entry price */
  current: number
  relaunched: boolean
}

/** Peak and current multiples of an idea's entry price (live Jupiter price, computed ATH, snapshot fallback). */
export function useIdeaReturns(idea: Idea): IdeaReturns | null {
  const source = returnsSource(idea)
  const market = useTokenMarket(source?.mint)
  const liveAth = useTokenAth(source?.mint)
  if (!source) return null
  const price = market?.price ?? source.snapshot?.price
  if (price == null) return null
  const ath = Math.max(liveAth ?? source.snapshot?.ath ?? 0, price)
  return { price, peak: ath / source.entry, current: price / source.entry, relaunched: source.relaunched }
}

export const formatMultiple = (m: number) => `${m >= 10 ? Math.round(m) : m.toFixed(1)}x`
