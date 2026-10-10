import { Fragment } from 'react'
import { LINKS } from '../lib/links'

/** Turns "@Mathis_btc" in a copy string into a link to his Telegram (applications go through him). */
export function WithMentions({ text }: { text: string }) {
  const parts = text.split('@Mathis_btc')
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <a href={LINKS.mathis} target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-dark">
              @Mathis_btc
            </a>
          )}
        </Fragment>
      ))}
    </>
  )
}
