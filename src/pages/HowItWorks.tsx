import type { ReactNode } from 'react'
import { IDEAS, TOP_BUILDERS, getIdea } from '../data/ideas'
import { IdeaTile } from '../components/IdeaCard'
import { ArrowRight, Button, Github, Glow, Pill, ThumbsUp, cx } from '../components/ui'
import { LINKS } from '../lib/links'

export default function HowItWorks() {
  const stack = [getIdea('basket'), getIdea('predict'), getIdea('pwe')].filter(Boolean) as typeof IDEAS

  return (
    <div className="relative isolate overflow-hidden">
      <Glow className="top-[240px] right-[-120px] h-[500px] w-[500px]" />
      <Glow className="top-[800px] left-[-200px] h-[500px] w-[500px]" />
      <Glow className="top-[1500px] right-[-160px] h-[500px] w-[500px]" />
      <Glow className="top-[2100px] left-[-220px] h-[500px] w-[500px]" />
      <Glow className="top-[2700px] right-[-140px] h-[500px] w-[500px]" />

      <div className="mx-auto flex max-w-[1072px] flex-col gap-28 px-5 pt-20">
        {/* Hero */}
        <header className="flex flex-col items-start gap-4 md:p-5">
          <div className="rise">
            <Pill>How it works</Pill>
          </div>
          <h1 className="rise text-[clamp(3rem,8vw,6rem)] leading-none font-bold [animation-delay:80ms]">
            From <span className="text-brand">spark</span> to startup, in 6 steps.
          </h1>
          <p className="rise text-lg font-bold text-muted [animation-delay:140ms]">
            Spark launches ideas directly on Futardio. Backers fund them, builders compete for the treasury, and the market picks
            who gets it. If no one wins, holders get the treasury back.
          </p>
        </header>

        <StepBlock
          n="01"
          kicker="The starting point"
          title="Back an idea you want to exist"
          body="Every Season 2 idea launches directly on Futardio, before any team exists. Back the one you want built, straight from Spark. Your money becomes the treasury builders compete for."
          visual={
            <div className="relative mx-auto h-[450px] w-[300px]">
              {stack.map((idea, i) => (
                <div
                  key={idea.slug}
                  className={cx('absolute top-4 left-2 w-[280px] origin-bottom-left', i < stack.length - 1 && 'shadow-float')}
                  style={{ transform: `rotate(${(stack.length - 1 - i) * 8}deg)`, zIndex: i }}
                >
                  <IdeaTile idea={idea} link={false} />
                </div>
              ))}
            </div>
          }
        />

        <StepBlock
          reverse
          n="02"
          kicker="Where your money goes"
          title="100% backed, exit anytime"
          body="80% of the raise goes to the idea’s treasury, locked until a decision market approves a builder. 20% seeds liquidity so the coin is tradable once the raise closes, and you can exit anytime."
          visual={<DonutCard />}
        />

        <StepBlock
          n="03"
          kicker="What you get back"
          title="You get the idea’s coin, same price for everyone"
          body="No insiders, no pre-sale, no early discounts. The coin goes only to the people who funded the idea, and it governs the treasury through futarchy."
          visual={<AllocationCard />}
        />

        <StepBlock
          reverse
          n="04"
          kicker="Builders step up"
          title="Builders compete for the treasury"
          body="Teams pitch a proposal to the idea’s DAO: what they will build and what they want for it, in USDC, tokens or both."
          visual={<BuildersCard />}
        />

        <StepBlock
          n="05"
          kicker="The decision"
          title="The market picks the winner"
          body="No jury. Each proposal gets a pass and a fail market. If traders expect the coin to be worth more with the proposal, it passes and the builder gets the treasury. If no team convinces the market, no one does."
          visual={<MarketChart />}
        />

        {/* 06 */}
        <section className="reveal flex flex-col gap-5 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[32px] leading-none font-bold text-brand">06</span>
              <span className="font-mono text-xs text-muted uppercase">Two possible outcomes</span>
            </div>
            <h2 className="text-[32px] leading-tight font-bold">Two ways it ends</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 md:p-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-brand bg-card p-6">
              <p className="text-sm font-medium text-brand uppercase">Outcome A</p>
              <p className="text-2xl font-bold">A builder wins the treasury</p>
              <p className="text-sm text-muted">A proposal passes and the builder gets the treasury to ship. You already hold the idea’s coin, so you own a piece of what gets built.</p>
              <p className="text-sm font-medium text-brand">Your coin backs the winning startup</p>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-muted/60 bg-card p-6">
              <p className="text-sm font-medium text-muted uppercase">Outcome B</p>
              <p className="text-2xl font-bold">Treasury back to holders</p>
              <p className="text-sm text-muted">If nobody convinces the market, the treasury is liquidated and every holder can claim their share back.</p>
              <p className="text-sm font-medium text-muted">No winner, no spend</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="reveal flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-[32px] leading-tight font-bold">Back the next big idea</h2>
          <p className="max-w-3xl text-lg font-bold text-muted">
            Spark launches ideas directly on Futardio. Backers fund them, builders compete for the treasury, and the market picks
            who gets it. If no one wins, holders get the treasury back.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Button to="/ideas">
              Explore Ideas <ArrowRight />
            </Button>
            <Button variant="secondary" href={`${LINKS.sparkV1}explanation`}>
              Documentation
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function StepBlock({
  n,
  kicker,
  title,
  body,
  visual,
  reverse,
}: {
  n: string
  kicker: string
  title: string
  body: string
  visual: ReactNode
  reverse?: boolean
}) {
  return (
    <section className="reveal grid items-center gap-10 py-8 md:grid-cols-2">
      <div className={cx('flex max-w-[470px] flex-col gap-4 md:p-2.5', reverse && 'md:order-2')}>
        <span className="text-[32px] leading-none font-bold text-brand">{n}</span>
        <span className="font-mono text-xs text-muted uppercase">{kicker}</span>
        <h2 className="text-[32px] leading-tight font-bold">{title}</h2>
        <p className="text-muted">{body}</p>
      </div>
      <div className={cx('flex justify-center', reverse && 'md:order-1')}>{visual}</div>
    </section>
  )
}

function DonutCard() {
  return (
    <div className="relative h-[352px] w-full max-w-[483px] rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="absolute top-5 left-6 w-[147px] text-center text-muted">
        <p className="text-2xl font-bold">20%</p>
        <p className="mt-2 text-sm font-medium">Liquidity pool, tradable, exit anytime</p>
      </div>
      <svg viewBox="0 0 240 240" className="absolute top-[59px] left-1/2 h-[240px] w-[240px] -translate-x-[40%]" aria-hidden="true">
        <mask id="donut-mask" fill="white">
          <path d="M120 8c0-4.418 3.586-8.028 7.995-7.733A120 120 0 1 1 3.656 90.604c1.083-4.284 5.624-6.58 9.826-5.214l11.032 3.585c4.202 1.365 6.465 5.874 5.468 10.178A92.4 92.4 0 1 0 127.99 27.946c-4.4-.382-7.99-3.928-7.99-8.346V8Z" />
        </mask>
        <path
          d="M120 8c0-4.418 3.586-8.028 7.995-7.733A120 120 0 1 1 3.656 90.604c1.083-4.284 5.624-6.58 9.826-5.214l11.032 3.585c4.202 1.365 6.465 5.874 5.468 10.178A92.4 92.4 0 1 0 127.99 27.946c-4.4-.382-7.99-3.928-7.99-8.346V8Z"
          stroke="#F59122"
          strokeWidth="56"
          fill="none"
          mask="url(#donut-mask)"
        />
        <path
          d="M14.468 82.49c-4.163-1.48-6.363-6.068-4.61-10.123A120 120 0 0 1 108.634.54c4.397-.419 8.084 3.088 8.208 7.504l.327 11.596c.125 4.416-3.362 8.062-7.752 8.568A92.4 92.4 0 0 0 35.938 81.64c-1.834 4.02-6.377 6.214-10.54 4.734L14.468 82.49Z"
          className="fill-muted/35"
        />
      </svg>
      <div className="absolute right-6 bottom-5 w-[112px] text-center text-brand">
        <p className="text-2xl font-bold">80%</p>
        <p className="mt-2 text-sm font-medium">Investments pool, funds the winner</p>
      </div>
    </div>
  )
}

function AllocationCard() {
  const rows = ['0% - VC', '0% - Early investors', '0% - Team allocation', '0% - Foundation']
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-line bg-card p-8 shadow-card">
      <div className="bg-brand-gradient flex h-[41px] items-center justify-center rounded-xl text-lg font-bold text-white uppercase">100% - Community</div>
      {rows.map((r) => (
        <div key={r} className="flex items-center">
          <div className="bg-brand-gradient h-[41px] w-2.5 shrink-0 rounded-xl" />
          <p className="flex-1 text-center text-lg font-bold uppercase">{r}</p>
        </div>
      ))}
    </div>
  )
}

function BuildersCard() {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-card">
      <p className="text-sm font-medium uppercase">Top builders</p>
      {TOP_BUILDERS.map((b) => {
        const row = (
          <>
            <div className="flex w-[134px] items-center gap-3">
              <img src={b.avatar} alt="" className="h-8 w-8 rounded-full" />
              <span className="truncate text-sm font-medium">{b.handle}</span>
            </div>
            <div className="hidden w-[96px] items-center gap-2 text-muted sm:flex">
              <Github className="h-5 w-5" />
              <span className="truncate text-xs">{b.repo}</span>
            </div>
            <div className="flex w-[80px] gap-2 font-mono text-xs">
              <span className="text-success">+{b.up}</span>
              <span className="text-error">-{b.down}</span>
            </div>
            <div className="flex items-center justify-end gap-3 text-muted">
              <ThumbsUp className="h-4 w-4" />
              <span className="w-4 font-mono text-xs">{b.likes}</span>
            </div>
          </>
        )
        const className = 'flex items-center justify-between gap-2 rounded-xl bg-surface p-4'
        // Rows link to the builder's GitHub when we have it
        return b.url ? (
          <a key={b.handle} href={b.url} target="_blank" rel="noreferrer" className={cx(className, 'transition hover:bg-surface-hover')}>
            {row}
          </a>
        ) : (
          <div key={b.handle} className={className}>
            {row}
          </div>
        )
      })}
    </div>
  )
}

/** Light redraw of the decision market chart from the design (illustrative data). */
function MarketChart() {
  const tabs = ['Price', 'TWAP', '2H', '24H', 'All']
  const yLabels = ['0.1140', '0.1100', '0.1060', '0.1020']
  return (
    <div className="w-full max-w-[442px] rounded-2xl border border-line bg-card p-3 shadow-card">
      <div className="flex gap-1">
        {tabs.map((t, i) => (
          <span key={t} className={cx('rounded-full px-3 py-1.5 text-xs font-medium', i === 0 || i === 4 ? 'bg-surface-hover text-ink' : 'text-muted')}>
            {t}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 420 250" className="mt-2 w-full" role="img" aria-label="Pass and fail market prices over time">
        {[20, 80, 140, 200].map((y, i) => (
          <g key={y}>
            <line x1="0" x2="350" y1={y} y2={y} className="stroke-line" />
            <text x="410" y={y + 4} textAnchor="end" className="fill-muted font-mono text-[10px]">
              {yLabels[i]}
            </text>
          </g>
        ))}
        <line x1="0" x2="350" y1="140" y2="140" stroke="#A3A3A3" strokeDasharray="4 4" />
        <path d="M6 150 H110 V110 H200 V62 H300 V74 H340" fill="none" stroke="#F59122" strokeWidth="2.5" />
        <path d="M6 150 L12 196 H110 L118 199 H200 L206 196 H340" fill="none" stroke="#D64853" strokeWidth="2.5" />
        <Tag y={140} label="Spot" value="0.1060" color="#A3A3A3" />
        <Tag y={74} label="YES" value="0.1075" color="#F59122" />
        <Tag y={196} label="NO" value="0.1023" color="#D64853" />
        {['11:00', '28 Jun', '29 Jun'].map((d, i) => (
          <text key={d} x={70 + i * 110} y="242" className="fill-muted font-mono text-[10px]">
            {d}
          </text>
        ))}
      </svg>
    </div>
  )
}

function Tag({ y, label, value, color }: { y: number; label: string; value: string; color: string }) {
  return (
    <g>
      <rect x="296" y={y - 9} width="120" height="18" rx="3" fill={color} />
      <text x="304" y={y + 4} className="fill-white text-[10px] font-medium">
        {label}
      </text>
      <text x="410" y={y + 4} textAnchor="end" className="fill-white font-mono text-[10px]">
        {value}
      </text>
    </g>
  )
}
