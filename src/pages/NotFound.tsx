import { Link } from 'react-router'
export function NotFound() {
  return <div className="page-intro not-found"><span className="mono">404 / OUTSIDE THE INDEX</span><h1>Uncharted.</h1><p>This page hasn’t found its place yet.</p><Link className="text-link" to="/">Return to the index ↗</Link></div>
}
