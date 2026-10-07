import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { navigation } from './data/navigation/index'
import { projects } from './data/projects/index'
import { articles } from './data/editorial/index'
import { ScrollLink } from './components/navigation/ScrollLink'
import { Home } from './pages/Home'
import { Ivan } from './pages/Ivan/index'
import { Category } from './pages/Category'
import { Leadership } from './pages/Leadership'
import { Project } from './pages/Project'
import { NotFound } from './pages/NotFound'

const IvanReader = lazy(() => import('./pages/Ivan/Reader'))

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const name = pathname.startsWith('/ivan/') ? articles.find(item => pathname === `/ivan/${item.id}`)?.title : navigation.find(item => item.href === pathname)?.label ?? projects.find(project => pathname === project.route)?.title
    document.title = name && name !== 'Ivan Vashchenko' ? `${name} — Ivan Vashchenko` : 'Ivan Vashchenko'
  }, [pathname])
  return <>
    <ScrollLink className="skip-link" target="main" focus>Skip to content</ScrollLink>
    <Header />
    <main id="main" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ivan" element={<Ivan />} />
        <Route path="/ivan/:recordId" element={<Suspense fallback={<p className="ivan-reader" role="status">Loading…</p>}><IvanReader /></Suspense>} />
        {navigation.map(item => <Route key={item.id} path={item.href} element={item.category ? <Category category={item.category} /> : <Leadership />} />)}
        <Route path="/projects/:projectId" element={<Project />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </>
}
