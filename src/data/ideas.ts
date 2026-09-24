/** live: raise open · building: raise closed, builders wanted · hackathon: Season 1 build phase */
export type IdeaStatus = 'live' | 'ended' | 'building' | 'hackathon' | 'closed' | 'upcoming'

export type ProposalStatus = 'draft' | 'pending' | 'passed' | 'failed' | 'removed'

export type Proposal = {
  /** MetaDAO decision id, e.g. LFOWN-002 */
  id: string
  /** Futarchy proposal account; its state is read live on-chain */
  address: string
  title: string
  summary: string
  items: string[]
  /** Snapshot status, overridden by the on-chain state when available */
  status: ProposalStatus
  createdAt: string
  teamSponsored?: boolean
  /** Final time-weighted average prices of the pass and fail markets, in USD */
  twap?: { pass: number; fail: number }
  volumeUsd?: number
  /** Draft proposals need this much stake to become a live decision market */
  stake?: { staked: number; threshold: number }
  url: string
}

export type Idea = {
  slug: string
  ticker: string
  name: string
  tagline: string
  season: 1 | 2
  status: IdeaStatus
  raised: number
  goal: number
  category?: string
  image?: string
  /** SPL token mint, used to fetch live market price and ATH */
  mint?: string
  /** What the winning team shipped: website, GitHub, YouTube… */
  links?: { label: string; url: string }[]
  /** Token price and all-time high in USD. Fallback snapshot when live market data is unavailable. */
  token?: { price?: number; ath?: number }
  funders?: number
  /** Builders who pitched on this idea (Season 2 track record) */
  builders?: number
  /** Season 1 results: treasury at launch, performance, amount returned to backers */
  result?: { launched: number; change: number; refunded: number; winners?: number; winner?: { name: string; url?: string } }
  futardioUrl?: string
  /** Launch account of the MetaDAO launchpad (v0.7) on Solana mainnet */
  launchAddress?: string
  icoPrice?: number
  fdv?: string
  supply?: string
  endsAt?: string
  about?: string[]
  proposals?: Proposal[]
  /** Link to another page of the same idea (Season 1 record <-> Season 2 relaunch) */
  related?: { slug: string; label: string }
  /** Enables the legal terms page at /ideas/:slug/terms */
  legal?: {
    /** Who operates the raise page */
    entity: string
    /** ISO date of the current version */
    updatedAt: string
    /** Highlighted note at the top of the terms */
    notice?: string
  }
}

export const IDEAS: Idea[] = [
  // Season 1 — raised on Spark v1
  {
    slug: 'predict',
    ticker: 'PREDICT',
    name: 'AMM Prediction Market',
    tagline: 'An AMM-based prediction market.',
    category: 'DeFi',
    image: '/figma/idea-predict.png',
    mint: 'D4FeaXPt7ZQTH5bYkLzFpyamFER4ZGue6F4tuC6fZspk',
    token: { price: 0.00179, ath: 0.00955 }, // GeckoTerminal snapshot, 2026-09-24
    links: [{ label: 'GitHub', url: 'https://github.com/EwanSpark/pmAMM' }],
    related: { slug: 'predict-v2', label: 'Relaunching in Season 2 on Futardio' },
    about: [
      'Omnipair has built unified liquidity infrastructure on Solana, and we believe it can be the backbone for prediction markets: bets on prices, micro-markets, community-driven outcomes. Omnipair pools are a natural fit for this.',
      'The idea is an open prediction market layer on top of that infrastructure. Something permissionless, where anyone can spin up a market on any event and let the pools handle the rest.',
      'We are not prescribing the exact shape of it. The primitive is there, and we want builders to run with it.',
    ],
    season: 1,
    status: 'closed',
    raised: 17514.35,
    goal: 10000,
    result: { launched: 20000, change: -15, refunded: 17000, winners: 1, winner: { name: 'Mathis_btc' } },
  },
  {
    slug: 'basket',
    ticker: 'BASKET',
    name: 'Multi Asset Index',
    tagline: 'One token, a basket of assets.',
    category: 'DeFi',
    image: '/figma/idea-basket.png',
    mint: '5yTFbtAE5RDjxpiVpDfyWuzcCWgwh659CEu7a7ZQtSpk',
    token: { price: 0.002, ath: 0.00309 }, // GeckoTerminal snapshot, 2026-09-16
    links: [{ label: 'Website', url: 'https://basketsolana.xyz/' }],
    about: [
      'Most crypto traders are forced to bet on individual projects, taking concentrated single-asset risk on coins that may or may not win their narrative. If you believe in ownership coins, LSTs or privacy as a thesis, there is no clean way to express that view: you pick one, and you eat the idiosyncratic risk of that specific team, tokenomics and launch.',
      'BASKET is a Solana multi-asset index protocol that lets you long or short entire narratives instead of single projects. META5 is a token backed by the top 5 ownership coins, LST10 the top 10 liquid staking tokens, and the same goes for PRIV5, DEFI10, PUMP10 or BANK3: exposure to a whole pocket of the market rather than a bet on the winner.',
      'The vault stores balances, not weights. Weights are implied, so a $100K vault with 5 assets starts with $20K of each, then balances stay fixed and weights drift with the market. No rebalancing on every price tick and no oracle dependency for weights, which keeps it cheap and lets the index breathe.',
      'Adding or removing an asset is the only rebalancing moment: a new asset at 10% weight in a $100K vault at $2 per token means $10K, so 5,000 tokens, and older positions scale to 90% to fund it. On top of that you can lever the narrative instead of a single asset, and short one you think is overheated. Version 1 stays permissioned, because bad baskets become bad collateral, and bad collateral becomes bad leverage.',
      'Solana now has enough mature, liquid thesis-grade tokens (ownership coins, LSTs, privacy, RWA, prediction markets) that narrative-level indices make sense as collateral, and levered narrative exposure becomes its own asset class.',
    ],
    season: 1,
    status: 'closed',
    raised: 22286.96,
    goal: 10000,
    result: { launched: 20000, change: -10, refunded: 17999, winners: 1, winner: { name: 'GainsuGoblino', url: 'https://x.com/GainsuGoblino' } },
  },
  {
    slug: 'pwe',
    ticker: 'PWE',
    name: 'The Community-Owned Pigeon',
    tagline: 'A pigeon, owned by its community.',
    category: 'Culture',
    image: '/figma/idea-pwe.jpg',
    mint: 'DQSNQgUnQreKpssYTATsfjpjncAXdSBuwx8uBRgzTSPk',
    token: { price: 0.1007, ath: 0.15575 }, // GeckoTerminal snapshot, 2026-09-16
    links: [{ label: 'YouTube', url: 'https://www.youtube.com/@pigeon-on-balcony' }],
    about: [
      'Most crypto projects launch with big promises, complicated roadmaps and high-risk speculation. We wanted to try something different. A wild wood pigeon decided to build a nest on my balcony, and the internet loved it. Instead of turning it into another meme coin, we built a transparent community project around a real story unfolding in real time.',
      'PwePwe ($PWE) is a community-owned pigeon livestream powered by Spark. Of the $10,000 raised, $9,000 (90%) is permanently deployed as liquidity and $1,000 (10%) goes to the treasury. Only $500 was initially requested, to reimburse hardware costs: camera, Raspberry Pi, storage and streaming infrastructure. So 90% of the funds are protected from day one, every treasury spend has to be approved by token holders, and trading fees can be reinvested into liquidity.',
      'A dedicated camera watches the nest 24/7 and a Raspberry Pi streams it continuously to YouTube, while the community gets exclusive updates, clips and behind-the-scenes content through Telegram and X.',
      'The story is already happening: the eggs are in the nest, and every day brings incubation, hatching, feeding, first feathers and first flights. More than that, the world needs a little more kindness, tenderness and poetry. Come relax, follow the journey, and listen to the gentle sounds of this beautiful little family.',
    ],
    season: 1,
    status: 'closed',
    raised: 10703.66,
    goal: 10000,
    // The $500 paid to the winner came back to the treasury out of fees, so it ends flat
    result: { launched: 10000, change: 0, refunded: 10000, winners: 1, winner: { name: 'Theo' } },
  },
  {
    slug: 'clawpilot',
    ticker: 'CLAWPILOT',
    name: 'OpenClaw Instances for Investors',
    tagline: 'Managed OpenClaw instances for investors.',
    category: 'AI',
    image: '/figma/idea-clawpilot.png',
    mint: 'y6qTpA6VMXiZfqxcBkyaMSUACXi7LG73sbe6oYspArK',
    token: { price: 0.000198, ath: 0.00622 }, // GeckoTerminal snapshot, 2026-09-15
    links: [{ label: 'GitHub', url: 'https://github.com/sparkfun-labs/xClawAI' }],
    about: [
      'Every investor holds several positions across projects, some short-term and some long-term, with governance votes and trades, product updates and prices constantly moving. Keeping track of all of it is extremely difficult.',
      'ClawPilot deploys preconfigured, hosted OpenClaw instances for investors, with specialised skills: 24/7 market monitoring, automatic earnings and news summaries, conditional DCA strategy execution, on-chain alerts, natural language portfolio analysis, and support for investment decisions and execution.',
      'Investors interact with their instance from WhatsApp, Telegram or Discord, with no technical setup needed.',
    ],
    season: 1,
    status: 'closed',
    raised: 4079,
    goal: 2500,
    result: { launched: 4079, change: -34.7, refunded: 2663, winners: 1 },
  },
  {
    slug: 'mkta',
    ticker: 'MKTA',
    name: 'Skill for Marketing',
    tagline: 'A marketing skill for AI agents.',
    category: 'AI',
    image: '/figma/idea-mkta.png',
    mint: 'C5sEDrJBTpg8YoK2pirey8gzjB78G91YNamVSrABGspK',
    token: { price: 0.00109, ath: 0.00169 }, // GeckoTerminal snapshot, 2026-09-16
    about: [
      'Early-stage Solana builders waste hours on the same things: branding, visuals, social posts, templates, mascots and launch announcements. The idea is a tool that solves at least one of those pain points and helps them look professional and ship their marketing faster.',
      'It can be anything a real builder could use tomorrow: a Claude skill, a small web app, a Telegram bot or a CLI tool. A brand kit generator with logo, colors and typography. A post template engine for X threads. A mascot creator for projects. A content calendar planner with AI drafts. A visual asset pipeline for banners, OG images and profile pictures.',
      'We did not expect a polished product, but a working demo showing a clear idea, real usefulness and a taste of what it could become. The more complete and usable the tool, the better the chances of winning the treasury.',
    ],
    season: 1,
    status: 'closed',
    raised: 2725.11,
    goal: 2500,
    result: { launched: 2725, change: 0, refunded: 2725 },
  },

  // Season 2 — ideas launched directly on Futardio
  {
    slug: 'lfown',
    ticker: 'LFOWN',
    name: 'LFOwn',
    tagline: 'A memecoin launchpad paired with ownership coins.',
    category: 'Memecoins · MetaDAO',
    image: '/figma/idea-lfown.png',
    mint: '5gDnzAC4EEFmTjFzFjHUXS7wx5Cdvi2NTKGZT61meta',
    // Fallback when Jupiter is unreachable. ATH = highest daily close of the main pool (ignores one-trade wicks), 2026-09-24
    token: { price: 0.00755, ath: 0.0142 },
    season: 2,
    status: 'building',
    raised: 31727,
    goal: 10000,
    funders: 28,
    icoPrice: 0.001,
    fdv: '$13K',
    supply: '12.9M',
    endsAt: '2026-09-08T10:32:33Z',
    futardioUrl: 'https://www.futard.io/launch/5Lfuib2f4NRqxRkqXDpuokbAbchxY947CRtjxZoawWm',
    launchAddress: '5Lfuib2f4NRqxRkqXDpuokbAbchxY947CRtjxZoawWm',
    about: [
      'LFOwn should be a memecoin launchpad where the pair asset is a MetaDAO ownership coin instead of USDC, SOL or stocks. The idea comes from Vibhu’s thesis that Solana wins paired memecoins.',
      'Keep it simple: fork a bonding curve, replace SOL with an ownership coin, and route launcher fees back to the LFOWN DAO treasury. Bonus points for graduating on Omnipair.',
      'The raise closed at $31.7K and there is no team yet. Builders pitch their terms to the DAO and the decision market decides. If nobody steps up, Spark proposes to liquidate the treasury so every holder can claim it back.',
    ],
    proposals: [
      {
        id: 'LFOWN-002',
        address: '8bfQksywKgigkvQKznzfaQs9bBtw1fP9vexD3addi2dk',
        title: 'Recognize Spark as Core Contributor and Authorize a $58.71/mo Allowance',
        summary:
          'LFOwn was funded as an idea without a team. The product is now live, has launched 17 tokens, and has sent $600 to the treasury in its first days. This proposal recognizes Spark as core contributor and authorizes a $58.71/month allowance covering infrastructure and the project’s X account, still no fee share and no salary.',
        items: [
          'Recognition of Spark (@JustSparkIdeas), represented by Mathis and Ewan, as core contributor to LFOwn',
          'A $58.71/month operating allowance: Helius RPC $49, Cloudflare Worker + domain $5, X Premium $4.71',
          'No share of fees: every meme launched splits its fees 50/50 between its creator and the LFOwn treasury',
        ],
        status: 'passed',
        createdAt: '2026-09-10T11:34:00Z',
        teamSponsored: true,
        twap: { pass: 0.0032, fail: 0.003145 },
        volumeUsd: 66,
        url: 'https://metadao.fi/decisions/lfown-002',
      },
      {
        id: 'LFOWN-001',
        address: 'F4iSG79Tq3FSEMASqKNMpXsi72pFXTdgJdzCZULfdsoa',
        title: 'Recognize LFOwn’s Operators and Authorize a $58.71/mo Allowance',
        summary:
          'LFOwn was funded as an idea without a team. The product is now live, has launched 17 tokens, and has sent $600 to the treasury in its first days. This proposal recognizes Mathis and Ewan as the operators and authorizes a $58.71/month allowance covering infrastructure and the project’s X account, with no fee share, no salary, and a performance package of 1 LFOWN token.',
        items: [
          'Recognition of Mathis (@Mathis_btc) and Ewan (@Ewan_btc) as the operators of LFOwn',
          'A $58.71/month operating allowance covering infrastructure and the project’s X account',
          'Performance package of 1 LFOWN token, with no fee share and no salary from the treasury',
        ],
        status: 'draft',
        createdAt: '2026-09-10T10:40:00Z',
        stake: { staked: 0, threshold: 1_500_000 },
        url: 'https://metadao.fi/decisions/lfown-001',
      },
    ],
  },
  {
    slug: 'accrue',
    ticker: 'ACCRUE',
    name: 'Accrue',
    tagline: 'Yield on tokenized stocks, fully on-chain.',
    category: 'DeFi · Stocks',
    image: '/figma/idea-accrue.svg',
    mint: '31hoVYavdrwYVcbWoZtXpUvf84D5Zroqai2wSnkAmeta',
    token: { price: 0.00152, ath: 0.00206 }, // Snapshot 2026-09-24, ATH = highest daily close
    season: 2,
    status: 'building',
    raised: 46787.5,
    goal: 10000,
    funders: 34,
    icoPrice: 0.001,
    fdv: '$13K',
    supply: '12.9M',
    endsAt: '2026-09-15T16:17:00Z',
    futardioUrl: 'https://www.futard.io/launch/9hB7X9mFCUGPFkuCFQmqzpR3vr54t63sqNnzRVbagog3',
    launchAddress: '9hB7X9mFCUGPFkuCFQmqzpR3vr54t63sqNnzRVbagog3',
    about: [
      'Accrue is a vault where you deposit tokenized stocks and earn extra yield on them. Every step happens on-chain, rules are enforced by code, and there is no human in the loop.',
      'Deposit xStocks → post them as collateral on a Solana lending market → borrow USDC → deploy it into a transparent, liquid yield strategy → the spread accrues to depositors, with a performance fee to the Accrue DAO.',
      'There is no team yet. That’s the point. 100% of the funds sit in a multisig and nothing unlocks without a decision market approving it. Builders pitch their proposal, and the market decides.',
    ],
  },
  {
    slug: 'predict-v2',
    ticker: 'PREDICT',
    name: 'AMM Prediction Market',
    tagline: 'The open-source prediction-market AMM engine, live on Solana.',
    category: 'DeFi',
    image: '/figma/idea-predict-v2.jpg',
    mint: '5FtV5gisCyCqJHsiCne4pX2r6d2YPRF9Kcfx2DKvmeta',
    token: { price: 0.0017, ath: 0.00381 }, // Snapshot 2026-09-24, ATH = highest daily close
    season: 2,
    status: 'live',
    // Static fallback, replaced by the launch account on-chain
    raised: 70134,
    goal: 10000,
    funders: 28,
    icoPrice: 0.001,
    fdv: '$13K',
    supply: '12.9M',
    endsAt: '2026-09-22T16:08:19Z',
    futardioUrl: 'https://www.futard.io/launch/E4qjZxcFtC2dHmyq9GBZU1UeRQLbVVKkdNadjyCoSsyn',
    launchAddress: 'E4qjZxcFtC2dHmyq9GBZU1UeRQLbVVKkdNadjyCoSsyn',
    links: [{ label: 'GitHub', url: 'https://github.com/EwanSpark/pmAMM' }],
    related: { slug: 'predict', label: 'See the Season 1 record' },
    about: [
      'PREDICT was funded on Spark in Season 1, with $17.5K committed. Mathis_btc won the build and shipped pmAMM, an AMM-based prediction market, open source on GitHub.',
      'In Season 2 it relaunches directly on Futardio. The engine exists, the apps don’t: builders compete for the treasury, and a decision market picks the winner. Backers all get the same price, there is no team allocation, and the treasury is only spent when the market approves.',
      'The vision stays the same: an open, permissionless prediction market layer on top of Omnipair’s unified liquidity, where anyone can spin up a market on any event and let the pools handle the rest.',
    ],
  },
]

/**
 * Pages reachable by their URL only: never listed on Ideas, Home or in the track record.
 * Used for test launches (a Futardio launch needs a project page and legal terms URL).
 */
export const HIDDEN_IDEAS: Idea[] = [
  {
    slug: 'test',
    ticker: 'TEST',
    name: 'Test Project',
    tagline: 'A Spark test launch to iterate on the launch flow. Do not buy.',
    category: 'Test',
    season: 2,
    status: 'upcoming',
    raised: 0,
    goal: 10000,
    about: [
      'This is a test launch by the Spark team. It exists only to iterate on the full launch flow on Spark and Futardio: the project page, the legal terms, domain verification, the raise and the DAO.',
      'There is no product, no team and no roadmap behind $TEST. The project will be liquidated soon.',
      'Do not buy $TEST and do not fund this raise.',
    ],
    legal: {
      entity: 'Spark Ecosystem',
      updatedAt: '2026-09-21',
      notice: 'Test launch: $TEST only exists to test the Spark launch flow and will be liquidated soon. Do not buy the token or fund the raise.',
    },
  },
]

export const season = (s: 1 | 2) => IDEAS.filter((i) => i.season === s)
export const getIdea = (slug?: string) => [...IDEAS, ...HIDDEN_IDEAS].find((i) => i.slug === slug)
/** Position in the public list; undefined for hidden pages */
export const ideaNumber = (idea: Idea) => (IDEAS.includes(idea) ? IDEAS.indexOf(idea) + 1 : undefined)

/**
 * Track record inputs. Season 2 raised and committed amounts are added from the chain at runtime (see useTrackRecord).
 * Season 1 committed is the sum of each Season 1 idea's `raised`.
 */
/**
 * MetaDAO decision page slug for each proposal account. MetaDAO numbers decisions its own way
 * (LFOWN on-chain #3 is lfown-004) and some DAOs use the address prefix (eq85eav5), so it cannot be derived.
 * Proposals missing here link to the address-prefix page.
 */
export const METADAO_DECISIONS: Record<string, string> = {
  '8bfQksywKgigkvQKznzfaQs9bBtw1fP9vexD3addi2dk': 'lfown-002',
  '8vYoXqxgM119w8zXNNMNJmWiCPNTErRi3BS9vhRhNrP3': 'lfown-004',
  'Eq85eaV5SBZHUtgiQ8xTd46xLpJt2rekDfxqD4ifrbN8': 'eq85eav5',
}

export const TRACK_RECORD_BASE = {
  /** Amount kept across Season 1 */
  season1Raised: 51_000,
  /** Season 1 baselines; Season 2 ideas, wallets and builders are added at runtime */
  ideasFunded: 5,
  investors: 64,
  builders: 10,
}

export const PARTNERS = [
  { name: 'SwissBorg', logo: '/figma/partner-swissborg.png' },
  { name: 'Omnipair', logo: '/figma/partner-omnipair.png' },
  { name: 'Global Dollar Network', logo: '/figma/partner-globaldollar.png' },
]

/** Builders who shipped on Spark ideas. `url` links the row when we have their profile. */
export const TOP_BUILDERS = [
  { handle: 'Ewan', avatar: '/figma/builder-1.png', repo: 'Spark', url: 'https://github.com/EwanSpark', up: 342, down: 187, likes: 21 },
  { handle: 'Mathis_btc', avatar: '/figma/builder-2.png', repo: 'forge', url: 'https://github.com/TobieTom', up: 538, down: 219, likes: 18 },
  { handle: 'Cuddly', avatar: '/figma/builder-3.png', repo: 'predictedwtf', up: 482, down: 302, likes: 14 },
  { handle: 'Matt', avatar: '/figma/builder-4.png', repo: 'pm-amm', url: 'https://github.com/Mattdgn', up: 394, down: 128, likes: 9 },
]
