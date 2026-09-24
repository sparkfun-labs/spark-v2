import { useEffect } from 'react'

const SELECTOR = '.reveal:not(.is-visible), .reveal-stagger:not(.is-visible)'

/**
 * Adds `is-visible` to `.reveal` / `.reveal-stagger` elements as they scroll into view.
 * Watches the DOM so content rendered later (cards loading data) is picked up too.
 */
export function useReveal(routeKey: string) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const show = (el: Element) => el.classList.add('is-visible')
    // Tracked per effect run (not on the DOM) so re-runs (StrictMode, route changes) observe everything again.
    const observed = new WeakSet<Element>()

    const io =
      !reduced && 'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue
                show(entry.target)
                io?.unobserve(entry.target)
              }
            },
            { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
          )
        : null

    const scan = () => {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (observed.has(el)) return
        observed.add(el)
        if (el.classList.contains('reveal-stagger')) {
          Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(Math.min(i, 8))))
        }
        if (io) io.observe(el)
        else show(el)
      })
    }

    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io?.disconnect()
      mo.disconnect()
    }
  }, [routeKey])
}
