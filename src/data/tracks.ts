import { ChartLine, Coins, Pickaxe, Sparkle } from '../components/ui'

/*
 * The two kinds of ideas Spark raises for. Shared by the landing page (How it works tabs)
 * and the /how-it-works page, so both always tell the same story.
 */
export type Track = {
  key: string
  label: string
  steps: { icon: typeof Coins; label: string; title: string; body: string }[]
  split: [string, string]
  win: { title: string; body: string; result: string }
  lose: { title: string; body: string; result: string }
}

/** How it works, for the two kinds of ideas Spark raises for. */
export const TRACKS: Track[] = [
  {
    key: 'builder',
    label: 'Idea + builder',
    steps: [
      {
        icon: Sparkle,
        label: '01 · Apply',
        title: 'Anyone can bring their idea',
        body: 'Solo founders and small teams under $5K a month can apply by reaching @Mathis_btc on Telegram.',
      },
      {
        icon: Coins,
        label: '02 · Fund',
        title: 'Raise on backable.biz',
        body: 'Backers fund 8 months of runway at the same price as everyone, with a checkup after 3 months. By then, at most ~33% of it is spent.',
      },
      {
        icon: Pickaxe,
        label: '03 · Build',
        title: 'Ship in public',
        body: 'The builder now needs to deliver, and has until the 3-month checkup to prove traction on the project.',
      },
    ],
    split: ['at the 3-month checkup, if it works', 'if it doesn’t'],
    win: {
      title: 'The market sees it’s viable',
      body: 'The builder keeps shipping and iterating. They can raise more and increase their budget.',
      result: 'Keep building',
    },
    lose: {
      title: 'The project stops',
      body: 'No traction at the 3-month checkup: the treasury is liquidated. At worst about 33% has been spent. The builder keeps the IP of the project.',
      result: 'Most of the treasury comes back',
    },
  },
  {
    key: 'open',
    label: 'Idea, no builder yet',
    steps: [
      {
        icon: Coins,
        label: '01 · Fund',
        title: 'Back the idea',
        body: 'Spark launches the idea on Backable before any team exists. Everyone buys at the same price.',
      },
      {
        icon: Pickaxe,
        label: '02 · Build',
        title: 'Builders join',
        body: 'Builders join on Telegram, build in public and pitch proposals to the idea’s DAO.',
      },
      {
        icon: ChartLine,
        label: '03 · Decide',
        title: 'The market picks',
        body: 'Decision markets choose which proposal gets the treasury. No jury.',
      },
    ],
    split: ['if a winner', 'if no winner'],
    win: {
      title: 'A builder wins the treasury',
      body: 'A proposal passes and the builder gets the treasury to ship. You already hold the idea’s coin, so you own a piece of what gets built.',
      result: 'Your coin backs the winning startup',
    },
    lose: {
      title: 'Treasury back to holders',
      body: 'If no builder convinces the market, Spark calls the liquidation, usually after about a month, and every holder claims their share back.',
      result: 'No winner, no spend',
    },
  },
]
