import { useEffect, useState } from 'react'

/** The whole site is one page; checkout lives behind `#/checkout`. */
export type Route = { name: 'home' } | { name: 'checkout' } | { name: 'placed'; order: string }

function parse(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'checkout') return { name: 'checkout' }
  if (hash.startsWith('order/')) return { name: 'placed', order: decodeURIComponent(hash.slice(6)) }
  return { name: 'home' }
}

export function navigate(to: string) {
  window.location.hash = to
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse)
  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
