import { Link, useParams } from 'react-router-dom'
import { getIdea, type Idea } from '../data/ideas'
import { Button, Eyebrow, Glow } from '../components/ui'
import { LINKS } from '../lib/links'

/** Legal terms of an idea's raise, served at /ideas/:slug/terms (the "Legal Terms URL" asked by Futardio). */
export default function IdeaTerms() {
  const idea = getIdea(useParams().slug)

  if (!idea?.legal) {
    return (
      <div className="mx-auto max-w-[1072px] px-5 py-32 text-center">
        <h1 className="text-[32px] font-bold">Terms not found</h1>
        <Button to="/ideas" className="mt-8">
          Back to ideas
        </Button>
      </div>
    )
  }

  return <Terms idea={idea} legal={idea.legal} />
}

function Terms({ idea, legal }: { idea: Idea; legal: NonNullable<Idea['legal']> }) {
  const token = `$${idea.ticker}`
  const updated = new Date(legal.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const sections: [string, string[]][] = [
    [
      'About these terms',
      [
        `These terms govern your use of the ${idea.name} page on Spark (justspark.fun) and your participation in the ${token} raise and markets. Spark is operated by ${legal.entity} ("Spark", "we", "us"). By connecting a wallet, funding the raise or trading its markets, you accept these terms.`,
      ],
    ],
    [
      'How the raise works',
      [
        `The ${token} raise runs on the MetaDAO launchpad through Futardio. You commit USDC from your own wallet. If the minimum raise is not reached, commitments can be refunded. If it is reached, every backer receives ${token} at the same price, with no team allocation.`,
        'Raised funds are held in a treasury controlled by the idea’s futarchy DAO. They can only be spent when a decision market approves a proposal, for example funding a builder. If nobody convinces the market, the treasury stays with the DAO and its token holders.',
      ],
    ],
    [
      `What ${token} is, and is not`,
      [
        `${token} is the governance token of the idea’s DAO. It is not a share, a debt, a deposit or a security issued by Spark, and it gives no right to profits, dividends, buybacks or any payment from Spark or any builder.`,
        `Spark makes no promise that the idea will be built, that a builder will be selected, or that ${token} will keep any value. It can go to zero.`,
      ],
    ],
    [
      'Eligibility',
      [
        'You must be of legal age where you live and able to enter into these terms. You must not participate if you are subject to sanctions, or if you are located in or a resident of a jurisdiction where taking part in token raises or prediction markets is prohibited or requires a license. You are responsible for complying with the laws that apply to you, including tax.',
      ],
    ],
    [
      'Non-custodial service',
      [
        'Spark never holds your funds or your keys. Every transaction is signed in your own wallet and executed by on-chain programs that Spark does not control, including the MetaDAO launchpad, futarchy and conditional vault programs and Squads multisigs. Transactions on Solana are final and cannot be reversed by Spark.',
      ],
    ],
    [
      'Risks',
      [
        'Participating involves significant risk, including total loss of the funds you commit or trade: smart contract bugs or exploits, market volatility and low liquidity, losing trades in decision markets, regulatory changes, network outages, and the loss of your wallet or keys. Only commit what you can afford to lose.',
      ],
    ],
    [
      'No advice',
      [
        'Nothing on Spark is financial, investment, legal or tax advice. Prices, charts and data shown on the site are provided for information only, may be delayed or wrong, and should not be relied on as the sole basis of a decision.',
      ],
    ],
    [
      'No warranty and limitation of liability',
      [
        'Spark is provided "as is" and "as available", without warranties of any kind. To the maximum extent permitted by law, Spark and its contributors are not liable for any indirect, incidental or consequential loss, or for any loss of funds, tokens, profits or data arising from your use of the site or of the on-chain programs it connects to.',
      ],
    ],
    [
      'Changes',
      ['We may update these terms. The date below shows the latest version, which applies from the moment it is published.'],
    ],
  ]

  return (
    <div className="relative isolate overflow-hidden">
      <Glow className="top-[-120px] right-[-120px] h-[460px] w-[460px]" />

      <article className="mx-auto max-w-[760px] px-5 pt-10 pb-24">
        <Link to={`/ideas/${idea.slug}`} className="text-sm font-medium text-muted transition hover:text-ink">
          ← {token}
        </Link>

        <header className="mt-8 flex flex-col gap-3 border-b border-line pb-8">
          <Eyebrow>Legal terms</Eyebrow>
          <h1 className="text-[clamp(2rem,5vw,3rem)] leading-tight font-bold">
            {idea.name} ({token})
          </h1>
          <p className="text-sm text-muted">Last updated {updated}</p>
          {legal.notice && <p className="mt-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm">{legal.notice}</p>}
        </header>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map(([title, paragraphs], i) => (
            <section key={title} className="flex flex-col gap-3">
              <h2 className="text-xl font-bold">
                {i + 1}. {title}
              </h2>
              {paragraphs.map((p) => (
                <p key={p} className="leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">{sections.length + 1}. Contact</h2>
            <p className="leading-relaxed text-muted">
              Questions about these terms can be sent to the Spark team on{' '}
              <a href={LINKS.telegram} target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-dark">
                Telegram
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
