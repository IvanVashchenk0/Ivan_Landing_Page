import { Link } from 'react-router'
import { navigation } from '../data/navigation/index'

export function Leadership() {
  const item = navigation.find(link => link.id === 'leadership')!
  return <div className="placeholder-page">
    <div className="page-intro"><Link to="/" className="back-link mono">← BACK TO INDEX</Link><div className="page-kicker mono">A SPACE FOR WHAT COMES NEXT</div><h1 className="long-title">{item.label}<span className="name-dot">.</span></h1></div>
    <div className="empty-state"><span className="empty-symbol" aria-hidden="true">↗</span><div><span className="mono">IN DEVELOPMENT</span><h2>Built with others.</h2><p>A future collection of teams, initiatives, and the work we make possible together.</p><Link to="/" className="text-link">Explore the current work <span aria-hidden="true">↗</span></Link></div></div>
  </div>
}
