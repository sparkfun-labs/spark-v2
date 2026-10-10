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

/** Season 2 coin of a relaunched idea, as a multiple of its raise price at the fixed SEASON1_VALUED_AT price */
export const relaunchMultiple = (idea: Idea) => (idea.relaunch ? idea.relaunch.valuedAt / idea.relaunch.entryPrice : null)

/**
 * What a Season 1 backer got back per dollar: the USDC refunded when the season closed, plus, for ideas
 * relaunched in Season 2, the new ownership coin as if the same amount had been reinvested at its raise price,
 * valued at a fixed date so the figure doesn't follow every price move.
 */
export function seasonOneValueBack(idea: Idea): number | null {
  if (!idea.result) return null
  return 1 + idea.result.change / 100 + (relaunchMultiple(idea) ?? 0)
}

export const formatMultiple = (m: number) => `${m >= 10 ? Math.round(m) : m.toFixed(1)}x`
