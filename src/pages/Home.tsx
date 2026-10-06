import { useState } from 'react'
import { IDEAS, PARTNERS, season } from '../data/ideas'
import { useTrackRecord } from '../lib/useTrackRecord'
import { HeroCarousel } from '../components/HeroCarousel'
import { IdeaMarquee } from '../components/IdeaMarquee'
import { WordRotator } from '../components/WordRotator'
import {
  ArrowRight,
  Button,
  ChevronDown,
  Eyebrow,
  Glow,
  Pill,
  SectionHeading,
  Sparkle,
  StatCard,
  TelegramLogo,
  XLogo,
  cx,
} from '../components/ui'
import { LINKS } from '../lib/links'
import { TRACKS } from '../data/tracks'


const FAQ: { title: string; items: [string, string][] }[] = [
  {
    title: 'For backers',
    items: [
      [
        'What is Spark?',
        'Spark selects ideas worth building and raises money for them on Backable, the MetaDAO launchpad. Some ideas come with their builders, others find them after the raise. You back an idea at the same price as everyone and get its token.',
      ],
      [
        'What do I get when I back an idea?',
        'The idea’s token, at the same price as every other backer, tradable once the raise closes. The money goes to a treasury controlled by the idea’s DAO, not to the team. Ideas without a team have no team allocation. A founder who brings an idea only earns tokens through a performance package: five tranches unlocking at 2x, 4x, 8x, 16x and 32x the raise price, never within the first 18 months, and only while the 3-month average price stays above the threshold.',
      ],
      [
        'Why is the token mintable?',
        'Because the mint belongs to the DAO, not to the team: for every idea raised on Backable, the mint authority is the DAO’s treasury multisig. New tokens can only be created by a proposal that passes a decision market, for example to raise more money or reward contributors. If traders expect a mint to dilute holders without creating value, it fails. There is no freeze authority either, so nobody can lock your tokens.',
      ],
      [
        'How is the money spent?',
        'Builders get a fixed monthly budget. Anything above it needs a decision market to pass: if traders expect the token to be worth more with the proposal, the funds are released.',
      ],
      [
        'What happens if it doesn’t work out?',
        'The treasury is liquidated and holders get their share back. Ideas that come with their builder get 3 months, and raises are sized so those 3 months use at most about 30% of the treasury. If the project isn’t making money or the token hasn’t gone up by then, it is liquidated. For ideas without a builder, Spark calls the liquidation, usually after about a month.',
      ],
    ],
  },
  {
    title: 'For founders',
    items: [
      [
        'What does Spark bring?',
        'Funding, and everything around it: we select the ideas, set up the raise with you, and stay by your side after it with feedback and advice.',
      ],
      [
        'Who can apply?',
        'Solo founders and small teams spending less than $5,000 a month, who want to build in public. No idea of your own? Pick one of our ideas without a team, join us on Telegram and build it in public.',
      ],
      [
        'How does it work?',
        'Reach us on Telegram. We get on a call and check the idea is viable, then we raise on Backable enough for 3 months of your budget. After 3 months, if the project creates value and makes money, you can ask the market for a new budget. Otherwise the treasury is liquidated. Our next 4 raises are already planned, so reach out early.',
      ],
      [
        'How does Spark make money?',
        'From liquidity, not from your raise. The Meteora LP position created by MetaDAO at launch is split 50/50 between Spark and your idea’s DAO.',
      ],
    ],
  },
]

export default function Home() {
  // Season 2 ideas, most recent raise first
  const seasonTwo = [...season(2)].sort((a, b) => Date.parse(b.endsAt ?? '0') - Date.parse(a.endsAt ?? '0'))
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
        <div className="rise w-full max-w-[400px] [animation-delay:160ms]">
          <HeroCarousel ideas={seasonTwo} />
        </div>
      </section>

      {/* Track record */}
      <section className="mt-24 md:mt-40">
        <div className="mx-auto max-w-[880px] px-5">
          <SectionHeading eyebrow="Track record" title="Proof, not promises." />
          <div className="reveal-stagger mt-8 flex flex-wrap justify-center gap-4">
            {trackRecord.map((s) => (
              <div key={s.label} className="basis-[calc(50%-8px)] sm:basis-[calc(33.333%-11px)] md:flex-1 md:basis-0">
                <StatCard label={s.label} value={s.value} />
              </div>
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
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-[130px] items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-surface-hover"
              >
                <img src={p.logo} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <p className="text-lg font-bold">{p.name}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-32 md:mt-56 max-w-[1072px] px-5">
        <SectionHeading eyebrow="How it works" title={<>Fund. Build. Decide.<br />With a builder or without one.</>} />
        <HowItWorks />
      </section>

      {/* Two sides */}
      <section className="mx-auto mt-32 md:mt-56 max-w-[794px] px-5">
        <SectionHeading eyebrow="Two ways in" title="One idea. Two sides." />
        <div className="reveal-stagger mt-8 grid gap-4 md:grid-cols-2">
          <AudienceCard
            dark
            eyebrow="For backers"
            title={<>Fund ideas.<br />Own what gets built.</>}
            points={[
              <>
                Same price for everyone, ICO on{' '}
                <a href={LINKS.backable} target="_blank" rel="noreferrer" className="underline">
                  Backable
                </a>
              </>,
              'Tradable once the raise closes',
              'No winner? Holders claim the treasury back',
              'No VC, no presale. Founders earn tokens only from 2x',
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
              'Bring your own idea, or build one that is already funded',
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
      <section className="mx-auto mt-32 md:mt-56 max-w-[640px] px-5">
        <SectionHeading eyebrow="Got questions?" title="We’ve got answers." />
        <div className="mt-8 flex flex-col gap-10">
          {FAQ.map((group, g) => (
            <div key={group.title}>
              <p className="text-xs font-medium text-brand uppercase">{group.title}</p>
              <div className="reveal-stagger mt-3 flex flex-col gap-3">
                {group.items.map(([q, a], i) => (
                  <FaqItem key={q} q={q} a={a} defaultOpen={g === 0 && i === 0} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="mx-auto mt-32 md:mt-56 max-w-[564px] px-5">
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

function HowItWorks() {
  const [selected, setSelected] = useState(0)
  const track = TRACKS[selected]

  return (
    <div className="reveal mt-6 flex flex-col items-center gap-6 rounded-2xl border border-line bg-surface p-6 md:p-8">
      <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-line bg-card p-1" role="tablist">
        {TRACKS.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={cx(
              'rounded-lg px-4 py-2 text-sm font-bold transition',
              i === selected ? 'bg-brand-gradient text-white' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={track.key} className="page-enter flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col items-stretch justify-center gap-6 md:flex-row md:items-center md:gap-8">
          {track.steps.map((s, i) => (
            <div key={s.title} className="contents">
              <div className="flex flex-col gap-3 md:w-[208px]">
                <div className="flex items-center gap-3">
                  <s.icon className="h-6 w-6 text-brand" />
                  <span className="text-xs font-medium text-brand uppercase">{s.label}</span>
                </div>
                <p className="text-lg font-bold">{s.title}</p>
                <p className="text-sm text-muted">{s.body}</p>
              </div>
              {i < track.steps.length - 1 && <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted md:block" />}
            </div>
          ))}
        </div>

        <div className="flex w-full max-w-[508px] flex-col gap-2">
          <div className="h-px bg-muted/60" />
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted">{track.split[0]}</span>
            <span className="text-brand">{track.split[1]}</span>
          </div>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2 lg:w-auto lg:grid-cols-[420px_420px]">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5">
            <p className="text-xs font-medium text-brand uppercase">Outcome A</p>
            <p className="text-lg font-bold">{track.win.title}</p>
            <p className="text-sm text-muted">{track.win.body}</p>
            <p className="mt-auto text-sm font-medium text-success">{track.win.result}</p>
          </div>
          <div className="bg-brand-gradient flex flex-col gap-3 rounded-2xl p-5 text-white">
            <p className="text-xs font-medium uppercase">Outcome B</p>
            <p className="text-lg font-bold">{track.lose.title}</p>
            <p className="text-sm text-white/80">{track.lose.body}</p>
            <p className="mt-auto text-sm font-medium">{track.lose.result}</p>
          </div>
        </div>
      </div>
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
