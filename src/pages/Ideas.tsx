import { season } from '../data/ideas'
import { LiveIdeaCard, SeasonOneCard } from '../components/IdeaCard'
import { Button, Eyebrow, Glow, Pill } from '../components/ui'
import { LINKS, formatUsd } from '../lib/links'

export default function Ideas() {
  const s1 = season(1)
  // Upcoming raises (no end date yet) first, then the most recent
  const endOf = (i: { endsAt?: string }) => (i.endsAt ? Date.parse(i.endsAt) : Number.MAX_SAFE_INTEGER)
  const s2 = [...season(2)].sort((a, b) => endOf(b) - endOf(a))
  const s1Committed = s1.reduce((a, i) => a + i.raised, 0)

  return (
    <div className="relative isolate overflow-hidden">
      <Glow className="top-[-120px] right-[-80px] h-[500px] w-[500px]" />
      <Glow className="top-[700px] left-[-220px] h-[400px] w-[400px]" />
      <Glow className="top-[1300px] right-[-160px] h-[420px] w-[420px]" />

      <div className="mx-auto max-w-[1072px] px-5 pt-20">
        <header className="flex flex-col items-start gap-4">
          <div className="rise">
            <Pill dot>Season 2 is live</Pill>
          </div>
          <h1 className="rise text-[clamp(3rem,7vw,5rem)] leading-none font-bold [animation-delay:80ms]">
            Every idea, <span className="text-brand-gradient">on the record.</span>
          </h1>
          <p className="rise text-lg font-bold text-muted [animation-delay:140ms]">
            Season 2 ideas launch directly on Futardio, and you can fund them right here. Season 1 ideas were funded on Spark v1.
          </p>
        </header>

        <section className="mt-20">
          <SeasonHeader eyebrow="Season 2" title="Launched on Futardio" sub="Launched directly on Futardio. Fund with your Solana wallet." />
          <div className="reveal-stagger mt-8 grid gap-4 md:grid-cols-2">
            {s2.map((i) => (
              <LiveIdeaCard key={i.slug} idea={i} />
            ))}
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted/50 bg-surface p-10 text-center md:col-span-2">
              <p className="text-2xl font-bold">The next idea is coming</p>
              <p className="text-muted">Suggest one, or get notified first in the Spark Telegram.</p>
              <Button variant="secondary" className="mt-2" href={LINKS.telegram}>
                Join Telegram
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-24">
          <SeasonHeader eyebrow="Season 1" title="Track record" sub={`Funded on Spark v1 · ${s1.length} ideas · ${formatUsd(s1Committed)} committed`} />
          <div className="reveal-stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {s1.map((i) => (
              <SeasonOneCard key={i.slug} idea={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function SeasonHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line pb-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-[32px] leading-tight font-bold">{title}</h2>
      <p className="text-sm text-muted">{sub}</p>
    </div>
  )
}
