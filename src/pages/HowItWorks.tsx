import { useRef, useState, type ReactNode } from 'react'
import { TOP_BUILDERS, getIdea, type Idea } from '../data/ideas'
import { TRACKS, type Track } from '../data/tracks'
import { IdeaTile } from '../components/IdeaCard'
import { ArrowRight, Button, Github, Glow, Pill, TelegramLogo, ThumbsUp, cx } from '../components/ui'
import { LINKS } from '../lib/links'

type Step = { kicker: string; title: string; body: string; visual: ReactNode }
type Program = {
  key: 'incubator' | 'hackathon'
  name: string
  tagline: string
  intro: string
  track: Track
  steps: Step[]
  cta: ReactNode
}

function programs(stack: Idea[]): Program[] {
  const [incubator, hackathon] = TRACKS
  return [
    {
      key: 'incubator',
      name: 'Spark Incubator',
      tagline: 'Founders bring their idea',
      intro:
        'Solo founders and small teams bring their own idea, raise 3 months of runway on Backable and build it in public. After 3 months, the market says whether it keeps going.',
      track: incubator,
      steps: [
        {
          kicker: 'Apply',
          title: 'Anyone can bring their idea',
          body: 'Solo founders and small teams spending under $5K a month apply by reaching @Mathis_btc on Telegram.',
          visual: <ApplyCard />,
        },
        {
          kicker: 'Raise',
          title: 'Raise on backable.biz',
          body: 'Backers fund 3 months of runway, everyone at the same price. 80% goes to a treasury controlled by the project’s DAO and 20% seeds liquidity, so the coin is tradable once the raise closes. The raise is sized so those 3 months use at most about 33% of it.',
          visual: <DonutCard />,
        },
        {
          kicker: 'What backers get',
          title: 'Same price for everyone, founders earn only from 2x',
          body: 'No VC, no pre-sale, no early discounts: at launch, the coin goes only to the people who funded the project. The founder only earns tokens through a performance package: five tranches unlocking at 2x, 4x, 8x, 16x and 32x the raise price, never within the first 18 months, and only while the 3-month average price stays above the threshold. If the token never reaches 2x, nothing unlocks.',
          visual: <AllocationCard last="Founders - only from 2x" />,
        },
        {
          kicker: 'Build',
          title: '3 months to prove traction',
          body: 'The builder now needs to deliver. They get a fixed monthly budget and ship in public. Spending anything above it needs a decision market to pass: if traders expect the coin to be worth more with it, it passes.',
          visual: <MarketChart />,
        },
      ],
      cta: (
        <Button href={LINKS.telegram}>
          <TelegramLogo className="h-4 w-4" /> Apply on Telegram
        </Button>
      ),
    },
    {
      key: 'hackathon',
      name: 'Spark Hackathon',
      tagline: 'Builders compete for an idea',
      intro:
        'Spark launches an idea before any team exists. Backers fund it, builders join and pitch what they would build, and the market picks who gets the treasury.',
      track: hackathon,
      steps: [
        {
          kicker: 'Launch',
          title: 'Spark launches an idea',
          body: 'Spark picks an idea worth building and launches it on Backable, before any team exists.',
          visual: <StackCard stack={stack} />,
        },
        {
          kicker: 'Fund',
          title: 'Back the idea on backable.biz',
          body: 'Everyone buys at the same price. 80% of the raise goes to the idea’s treasury, controlled by its DAO, and 20% seeds liquidity so the coin is tradable once the raise closes.',
          visual: <DonutCard />,
        },
        {
          kicker: 'What backers get',
          title: '100% community, no team allocation',
          body: 'No VC, no pre-sale, no team tokens: the coin goes only to the people who funded the idea, and it governs the treasury through futarchy.',
          visual: <AllocationCard last="0% - Team" />,
        },
        {
          kicker: 'Build',
          title: 'Builders join and build in public',
          body: 'Builders join on Telegram, build in public and pitch a proposal to the idea’s DAO: what they will build and what they want for it, in USDC, tokens or both.',
          visual: <BuildersCard />,
        },
        {
          kicker: 'Decide',
          title: 'The market picks the winner',
          body: 'No jury. Every proposal gets a pass and a fail market. If traders expect the coin to be worth more with it, it passes and the builder gets the treasury to ship.',
          visual: <MarketChart />,
        },
      ],
      cta: (
        <>
          <Button to="/ideas">
            Explore Ideas <ArrowRight />
          </Button>
          <Button variant="secondary" href={LINKS.telegram}>
            <TelegramLogo className="h-4 w-4" /> Join the builders
          </Button>
        </>
      ),
    },
  ]
}

/** Navbar height (72px + border): the program tabs stick right under it. */
const NAV_OFFSET = 73

export default function HowItWorks() {
  const stack = [getIdea('basket'), getIdea('predict'), getIdea('pwe')].filter(Boolean) as Idea[]
  const all = programs(stack)
  const [active, setActive] = useState<Program['key']>(() => (window.location.hash === '#hackathon' ? 'hackathon' : 'incubator'))
  const program = all.find((p) => p.key === active)!
  const content = useRef<HTMLDivElement>(null)

  const select = (key: Program['key']) => {
    setActive(key)
    history.replaceState(null, '', `#${key}`)
    // Already scrolled into the steps: jump back to the top of the new program
    const el = content.current
    if (el && el.getBoundingClientRect().top < NAV_OFFSET) {
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - NAV_OFFSET - 72, behavior: 'instant' })
    }
  }

  return (
    <div className="relative isolate overflow-clip">
      <Glow className="top-[240px] right-[-120px] h-[500px] w-[500px]" />
      <Glow className="top-[800px] left-[-200px] h-[500px] w-[500px]" />
      <Glow className="top-[1500px] right-[-160px] h-[500px] w-[500px]" />
      <Glow className="top-[2100px] left-[-220px] h-[500px] w-[500px]" />
      <Glow className="top-[2700px] right-[-140px] h-[500px] w-[500px]" />

      {/* Hero */}
      <header className="mx-auto flex max-w-[1072px] flex-col items-start gap-4 px-5 pt-20 pb-12 md:px-10">
        <div className="rise">
          <Pill>How it works</Pill>
        </div>
        <h1 className="rise text-[clamp(3rem,8vw,6rem)] leading-none font-bold [animation-delay:80ms]">
          From <span className="text-brand">spark</span> to startup.
        </h1>
        <p className="rise text-lg font-bold text-muted [animation-delay:140ms]">
          Two ways in. In the Spark Incubator, founders bring their idea and raise 3 months of runway. In Spark Hackathon, Spark
          launches an idea and builders compete to build it. Either way the raise runs on Backable, the market decides when the
          treasury gets spent, and if nothing ships, holders get it back.
        </p>
      </header>

      {/* Program tabs, pinned under the navbar while scrolling */}
      <div className="sticky z-30 border-y border-line bg-bg/80 px-5 py-3 backdrop-blur-xl" style={{ top: NAV_OFFSET }}>
        <div className="mx-auto grid max-w-[560px] grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1" role="tablist">
          {all.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={p.key === active}
              onClick={() => select(p.key)}
              className={cx(
                'flex flex-col items-center rounded-xl px-3 py-2.5 transition',
                p.key === active ? 'bg-brand-gradient text-white shadow-card' : 'text-muted hover:bg-surface hover:text-ink',
              )}
            >
              <span className="text-sm font-bold sm:text-base">{p.name}</span>
              <span className={cx('hidden text-xs font-medium sm:block', p.key === active ? 'text-white/80' : 'text-muted')}>{p.tagline}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={program.key} ref={content} className="page-enter mx-auto flex max-w-[1072px] flex-col gap-28 px-5 pt-16">
        <section className="flex flex-col items-start gap-3 md:p-5">
          <span className="font-mono text-xs text-brand uppercase">{program.tagline}</span>
          <h2 className="text-[clamp(2rem,5vw,3rem)] leading-tight font-bold">{program.name}</h2>
          <p className="max-w-3xl text-lg text-muted">{program.intro}</p>
        </section>

        {program.steps.map((s, i) => (
          <StepBlock key={s.title} reverse={i % 2 === 1} n={String(i + 1).padStart(2, '0')} kicker={s.kicker} title={s.title} body={s.body} visual={s.visual} />
        ))}

        <section className="reveal flex flex-col gap-5 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[32px] leading-none font-bold text-brand">{String(program.steps.length + 1).padStart(2, '0')}</span>
              <span className="font-mono text-xs text-muted uppercase">Two possible outcomes</span>
            </div>
            <h2 className="text-[32px] leading-tight font-bold">How it ends</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 md:p-8">
            <div className="flex flex-col gap-3 rounded-2xl border border-brand bg-card p-6">
              <p className="text-sm font-medium text-brand uppercase">{program.track.split[0]}</p>
              <p className="text-2xl font-bold">{program.track.win.title}</p>
              <p className="text-sm text-muted">{program.track.win.body}</p>
              <p className="mt-auto text-sm font-medium text-brand">{program.track.win.result}</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-muted/60 bg-card p-6">
              <p className="text-sm font-medium text-muted uppercase">{program.track.split[1]}</p>
              <p className="text-2xl font-bold">{program.track.lose.title}</p>
              <p className="text-sm text-muted">{program.track.lose.body}</p>
              <p className="mt-auto text-sm font-medium text-muted">{program.track.lose.result}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="reveal flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-[32px] leading-tight font-bold">{program.key === 'incubator' ? 'Got an idea? Build it with Spark' : 'Back the next big idea, or build it'}</h2>
          <p className="max-w-3xl text-lg font-bold text-muted">
            {program.key === 'incubator'
              ? 'Solo founders and small teams spending under $5K a month: reach @Mathis_btc on Telegram to apply.'
              : 'Fund an idea from Spark at the same price as everyone, or join the builders on Telegram and pitch what you would build.'}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">{program.cta}</div>
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

/** Hackathon step 01 visual: a fanned stack of real idea tiles. */
function StackCard({ stack }: { stack: Idea[] }) {
  return (
    <div className="relative mx-auto h-[360px] w-[260px]">
      {stack.map((idea, i) => (
        <div
          key={idea.slug}
          className={cx('absolute top-2 left-2 w-[220px] origin-bottom-left', i < stack.length - 1 && 'shadow-float')}
          style={{ transform: `rotate(${(stack.length - 1 - i) * 8}deg)`, zIndex: i }}
        >
          <IdeaTile idea={idea} link={false} />
        </div>
      ))}
    </div>
  )
}

/** Incubator step 01 visual: who can apply, and where. */
function ApplyCard() {
  const checks = ['Solo founder or small team', 'Under $5K of spend a month', 'Ready to build in public for 3 months']
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl border border-line bg-card p-8 shadow-card">
      <p className="text-sm font-medium uppercase">Who can apply</p>
      {checks.map((c) => (
        <div key={c} className="flex items-center gap-3">
          <span className="bg-brand-gradient grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold text-white">✓</span>
          <p className="text-lg font-bold">{c}</p>
        </div>
      ))}
      <Button variant="solid" className="w-full" href={LINKS.telegram}>
        <TelegramLogo className="h-4 w-4" /> Apply on Telegram
      </Button>
    </div>
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

function AllocationCard({ last }: { last: string }) {
  const rows = ['0% - VC', '0% - Early investors', '0% - Foundation', last]
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
