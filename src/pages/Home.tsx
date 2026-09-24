import { useState } from 'react'
import { IDEAS, PARTNERS, season } from '../data/ideas'
import { useTrackRecord } from '../lib/useTrackRecord'
import { HeroIdeaCard } from '../components/IdeaCard'
import { IdeaMarquee } from '../components/IdeaMarquee'
import { WordRotator } from '../components/WordRotator'
import {
  ArrowRight,
  Button,
  ChartLine,
  ChevronDown,
  Coins,
  Eyebrow,
  Glow,
  Pickaxe,
  Pill,
  SectionHeading,
  Sparkle,
  StatCard,
  TelegramLogo,
  XLogo,
  cx,
} from '../components/ui'
import { LINKS } from '../lib/links'

const STEPS = [
  {
    icon: Coins,
    label: '01 · Fund',
    title: 'Back the idea',
    body: 'Ideas launch directly on Futardio, before any team exists. Fund one from Spark at the same price as everyone.',
  },
  {
    icon: Pickaxe,
    label: '02 · Build',
    title: 'Builders compete',
    body: 'Teams pitch proposals to the idea’s DAO and compete for its treasury.',
  },
  {
    icon: ChartLine,
    label: '03 · Decide',
    title: 'The market picks',
    body: 'Decision markets choose which proposal gets the treasury. No jury.',
  },
]

const FAQ = [
  [
    'What is Spark?',
    'Spark finds ideas worth building and launches them directly on Futardio, before any team exists. Backers fund the idea and get its coin, builders compete for the treasury, and decision markets pick who gets funded.',
  ],
  [
    'How much do I need to start?',
    'Any amount of USDC from a Solana wallet, plus a little SOL for transaction fees. Everyone gets the same price, whether you put in $10 or $10,000.',
  ],
  [
    'Can I get my money back if I change my mind?',
    'Commitments are final while a raise is open. Once it closes, the idea’s coin is tradable, so you can sell anytime. If no builder wins, the treasury can be liquidated and every holder claims their share back.',
  ],
  [
    'How do I make money on Spark?',
    'If a builder ships something valuable, the idea’s coin can be worth more. Nothing is guaranteed, so only back what you can afford to lose.',
  ],
  [
    'Who decides which builder wins?',
    'The market. Every builder proposal gets a pass and a fail market on the idea’s DAO. If traders expect the coin to be worth more with the proposal, it passes and the builder gets funded.',
  ],
  [
    'What changed since Season 1?',
    'Season 1 ideas were funded on Spark first. From Season 2, every idea launches directly on Futardio, and Spark is where you discover ideas, fund them and follow their proposals.',
  ],
]

export default function Home() {
  // Most recent Season 2 raise; the card itself checks on-chain whether it is still live
  const live = [...season(2)].sort((a, b) => Date.parse(b.endsAt ?? '0') - Date.parse(a.endsAt ?? '0'))[0]
  const trackRecord = useTrackRecord()

  return (
    <div className="relative isolate overflow-hidden">
      <Glow className="top-[-80px] left-[48%] h-[500px] w-[500px]" />
      <Glow className="top-[560px] left-[4%] h-[300px] w-[300px]" />
      <Glow className="top-[620px] right-[-60px] h-[400px] w-[400px]" />
      <Glow className="top-[1500px] left-[-160px] h-[420px] w-[420px]" />
      <Glow className="top-[2300px] right-[-120px] h-[460px] w-[460px]" />
      <Glow className="top-[3200px] left-[10%] h-[380px] w-[380px]" />
      <Glow className="top-[4000px] right-[15%] h-[420px] w-[420px]" />

      {/* Hero */}
      <section className="mx-auto flex max-w-[1072px] flex-col items-center gap-12 px-5 pt-20 pb-40 lg:flex-row lg:gap-8 lg:pt-32">
        <div className="flex flex-1 flex-col items-start gap-6">
          <div className="rise">
            <Pill dot>Live on Solana</Pill>
          </div>
          <h1 className="rise text-[clamp(2.5rem,6.2vw,5rem)] leading-none font-bold [animation-delay:80ms]">
            Fund the next
            <br />
            <WordRotator words={['Idea.', 'Hackathon.', 'Startup.', 'Ownership Coin.']} />
          </h1>
          <p className="rise text-muted [animation-delay:140ms]">Back an idea on day one. Let the market pick who builds it.</p>
          <div className="rise flex flex-wrap gap-4 [animation-delay:200ms]">
            <Button to="/ideas">
              Explore Ideas <ArrowRight />
            </Button>
            <Button variant="secondary" to="/how-it-works">
              How it works
            </Button>
          </div>
        </div>
        {live && (
          <div className="rise w-full max-w-[320px] [animation-delay:160ms]">
            <HeroIdeaCard idea={live} />
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="mx-auto mt-24 max-w-[1072px] px-5">
        <SectionHeading eyebrow="How it works" title={<>Fund. Build. Decide.<br />Two outcomes, both known upfront.</>} />
        <div className="reveal mt-6 flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface p-6 md:p-8">
          <div className="flex w-full flex-col items-stretch justify-center gap-6 md:flex-row md:items-center md:gap-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="contents">
                <div className="flex flex-col gap-3 md:w-[208px]">
                  <div className="flex items-center gap-3">
                    <s.icon className="h-6 w-6 text-brand" />
                    <span className="text-xs font-medium text-brand uppercase">{s.label}</span>
                  </div>
                  <p className="text-lg font-bold">{s.title}</p>
                  <p className="text-sm text-muted">{s.body}</p>
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted md:block" />}
              </div>
            ))}
          </div>

          <div className="flex w-full max-w-[508px] flex-col gap-2">
            <div className="h-px bg-muted/60" />
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted">if a winner</span>
              <span className="text-brand">if no winner</span>
            </div>
          </div>

          <div className="grid w-full gap-4 md:w-auto md:grid-cols-[420px_420px]">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5">
              <p className="text-xs font-medium text-brand uppercase">Outcome A</p>
              <p className="text-lg font-bold">A builder wins the treasury</p>
              <p className="text-sm text-muted">
                A proposal passes and the builder gets the treasury to ship. You already hold the idea’s coin, so you own a piece of
                what gets built.
              </p>
              <p className="text-sm font-medium text-success">Your coin backs the winning startup</p>
            </div>
            <div className="bg-brand-gradient flex flex-col gap-3 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium uppercase">Outcome B</p>
              <p className="text-lg font-bold">Treasury back to holders</p>
              <p className="text-sm text-white/80">
                If no builder convinces the market, the treasury is liquidated and every holder can claim their share back.
              </p>
              <p className="text-sm font-medium">No winner, no spend</p>
            </div>
          </div>
        </div>
      </section>

      {/* Track record */}
      <section className="mt-40">
        <div className="mx-auto max-w-[880px] px-5">
          <SectionHeading eyebrow="Track record" title="Proof, not promises." />
          <div className="reveal-stagger mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {trackRecord.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </div>

        <IdeaMarquee ideas={IDEAS} />

        <div className="mx-auto mt-8 h-px max-w-[648px] bg-muted/40" />

        {/* Partners */}
        <div className="mx-auto mt-8 max-w-[992px] px-5">
          <SectionHeading eyebrow="Partners" title="Built alongside quality teams" />
          <div className="reveal-stagger mt-8 grid gap-4 md:grid-cols-3">
            {PARTNERS.map((p) => (
              <div key={p.name} className="flex h-[130px] items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-6">
                <img src={p.logo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <p className="text-lg font-bold">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two sides */}
      <section className="mx-auto mt-56 max-w-[794px] px-5">
        <SectionHeading eyebrow="Two ways in" title="One idea. Two sides." />
        <div className="reveal-stagger mt-8 grid gap-4 md:grid-cols-2">
          <AudienceCard
            dark
            eyebrow="For backers"
            title={<>Fund ideas.<br />Own what gets built.</>}
            points={[
              <>
                Same price for everyone, ICO on{' '}
                <a href={LINKS.futardio} target="_blank" rel="noreferrer" className="underline">
                  Futard.io
                </a>
              </>,
              'Tradable once the raise closes',
              'No winner? Holders claim the treasury back',
              '0% VC, 0% insiders. 100% community',
            ]}
            cta={
              <Button variant="solid" to="/ideas">
                Back an idea <ArrowRight />
              </Button>
            }
          />
          <AudienceCard
            eyebrow="For builders"
            title={<>Pitch a proposal.<br />Win the treasury.</>}
            points={[
              'Ideas are funded before a team exists',
              'Set your own terms: USDC, tokens or both',
              'The market decides, no jury',
              'Ship with the treasury behind you',
            ]}
            cta={
              <Button variant="solid" href={LINKS.telegram}>
                Pitch on Telegram <ArrowRight />
              </Button>
            }
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-56 max-w-[640px] px-5">
        <SectionHeading eyebrow="Got questions?" title="We’ve got answers." />
        <div className="reveal-stagger mt-8 flex flex-col gap-3">
          {FAQ.map(([q, a], i) => (
            <FaqItem key={q} q={q} a={a} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="mx-auto mt-56 max-w-[564px] px-5">
        <div className="reveal flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface px-5 py-12 text-center">
          <div className="flex flex-col gap-2">
            <Eyebrow>Where everything happens</Eyebrow>
            <h2 className="text-[32px] leading-tight font-bold">Join the community.</h2>
          </div>
          <p className="max-w-md text-sm text-muted">
            Every new idea, proposal and decision market is discussed in the open. Join the backers funding ideas and the builders
            competing for them.
          </p>
          <div className="flex w-full gap-4 px-4">
            <a
              href={LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
              className="flex h-[43px] flex-1 items-center justify-center rounded-xl bg-telegram text-white transition hover:brightness-110"
            >
              <TelegramLogo className="h-4 w-4" />
            </a>
            <a
              href={LINKS.x}
              target="_blank"
              rel="noreferrer"
              aria-label="X"
              className="flex h-[43px] flex-1 items-center justify-center rounded-xl bg-ink text-bg transition hover:bg-ink/85"
            >
              <XLogo className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function AudienceCard({
  eyebrow,
  title,
  points,
  cta,
  dark,
}: {
  eyebrow: string
  title: React.ReactNode
  points: React.ReactNode[]
  cta: React.ReactNode
  dark?: boolean
}) {
  return (
    <div className={cx('flex flex-col items-start justify-center gap-6 rounded-2xl p-8', dark ? 'bg-ink text-bg' : 'border border-line bg-surface')}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="text-[32px] leading-tight font-bold">{title}</h3>
      <ul className="flex flex-col gap-3">
        {points.map((p, i) => (
          <li key={i} className={cx('flex items-center gap-2 text-sm', dark ? 'text-bg/60' : 'text-muted')}>
            <Sparkle className="h-3 w-3 shrink-0 text-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  )
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button className="flex w-full items-center justify-between gap-4 p-4 text-left text-lg font-bold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {q}
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-muted transition duration-300', open && 'rotate-180')} />
      </button>
      {open && <p className="-mt-1 px-4 pb-4 text-sm text-muted">{a}</p>}
    </div>
  )
}
