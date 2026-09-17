import { useCallback, useEffect, useState } from 'react'
import { destroySmoothScroll, initSmoothScroll, ScrollTrigger } from './animation/scrollController'
import { CartProvider } from './state/cart'
import Nav from './components/ui/Nav'
import Loader from './components/ui/Loader'
import CartDrawer from './components/ui/CartDrawer'
import Journey from './sections/Journey'
import OurStory from './sections/OurStory'
import Products from './sections/Products'
import Footer from './sections/Footer'

export default function App() {
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    window.scrollTo(0, 0)
    initSmoothScroll()
    // Fonts change text metrics; re-measure every trigger once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => destroySmoothScroll()
  }, [])

  useEffect(() => {
    if (ready) ScrollTrigger.refresh()
  }, [ready])

  return (
    <CartProvider>
      <div id="top" className="grain">
        <Loader ready={ready} />
        <Nav />
        <main>
          <Journey onReady={onReady} />
          <OurStory />
          <Products />
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  )
}
