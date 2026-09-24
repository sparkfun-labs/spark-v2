# Spark

The website of [Spark](https://justspark.fun): ideas get funded, idea coins get launched, builders compete, and the market decides.

Season 2 ideas launch directly on [Futardio](https://www.futard.io) (the MetaDAO launchpad). People fund a raise from this site, then every builder proposal is settled by a futarchy decision market, which anyone can trade here.

## What the site does on-chain

Everything below is read from Solana mainnet, or signed in the visitor's own wallet. There is no backend database.

- **Funding a raise** — the MetaDAO launchpad `fund` instruction ([src/lib/futardio.ts](src/lib/futardio.ts)). Raise state, committed amount, investors and end time come from the launch account.
- **Proposals** — each DAO is scanned for its proposals, and the title is read from the memo of the Squads transaction that created it ([src/lib/daoProposals.ts](src/lib/daoProposals.ts)).
- **Trading pass / fail markets** — USDC or tokens are split into conditional tokens, then swapped on the futarchy AMM, with merge and redeem to exit ([src/lib/proposalMarket.ts](src/lib/proposalMarket.ts)).
- **Price history** — rebuilt from the futarchy events of each proposal's transactions and drawn as an SVG chart, with no charting library ([src/lib/proposalHistory.ts](src/lib/proposalHistory.ts), [src/components/PriceChart.tsx](src/components/PriceChart.tsx)).
- **Token price and all-time high** — fetched server-side and cached at the edge ([functions/api/market.ts](functions/api/market.ts)).

Editorial content (idea descriptions, Season 1 results, partners) lives in [src/data/ideas.ts](src/data/ideas.ts).

## Stack

React 19, TypeScript, Vite, Tailwind v4, react-router, Solana wallet adapter and Anchor. Hosted on Cloudflare Pages, with Pages Functions for the two API routes.

## Running it locally

```bash
npm install
npm run dev
```

The site calls Solana through `/api/rpc`, a proxy that keeps the RPC key server-side. Copy `.env.example` to `.env.local` and set your own endpoint:

```
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

Without it, the dev proxy falls back to a public RPC, which rate limits quickly. The variable has no `VITE_` prefix on purpose: it is never bundled into the client.

Other scripts:

```bash
npm run build      # typecheck and build to dist/
npm run preview    # serve the built site
```

## Deploying

```bash
npm run build
npx wrangler pages deploy dist --project-name spark-v2
```

`HELIUS_RPC_URL` is set once as a Cloudflare Pages secret (`wrangler pages secret put HELIUS_RPC_URL`), never committed.

## Security notes

- The RPC proxy only forwards an allowlist of methods, restricts `getProgramAccounts` to the two MetaDAO programs, and checks the request origin ([functions/api/rpc.ts](functions/api/rpc.ts)).
- The site never holds funds or keys: every transaction is signed in the visitor's wallet and executed by MetaDAO's on-chain programs.
