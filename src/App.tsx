import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { CursorGlow } from './components/CursorGlow'
import { useReveal } from './lib/useReveal'
import Home from './pages/Home'
import Ideas from './pages/Ideas'
import IdeaDetail from './pages/IdeaDetail'
import IdeaTerms from './pages/IdeaTerms'
import HowItWorks from './pages/HowItWorks'

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useReveal(pathname)

  return (
    <div className="relative flex min-h-screen flex-col">
      <CursorGlow />
      <Navbar />
      <main key={pathname} className="page-enter relative z-[1] flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/ideas/:slug" element={<IdeaDetail />} />
          <Route path="/ideas/:slug/terms" element={<IdeaTerms />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <div className="relative z-[1]">
        <Footer />
      </div>
    </div>
  )
}
