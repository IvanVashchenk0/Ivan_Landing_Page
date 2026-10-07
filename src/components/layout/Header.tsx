import { Link, useLocation } from 'react-router'
import { Navigation } from '../navigation/Navigation'

export function Header() {
  const isHome = useLocation().pathname === '/'
  return <header className="site-header">
    <Link to="/" className="monogram" aria-label="Ivan Vashchenko — home">IV<span className="monogram-dot">.</span></Link>
    {isHome ? <span className="header-caption mono">A PERSONAL INDEX</span> : <Navigation />}
    <Link to="/ivan" className="header-index mono">{isHome ? 'IVAN VASHCHENKO' : 'IVAN'} <span aria-hidden="true">↗</span></Link>
  </header>
}
