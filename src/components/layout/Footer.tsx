import { Link } from 'react-router'
import { contact } from '../../data/contact'

export function Footer() {
  return <footer className="site-footer" id="footer">
    <Link to="/" className="footer-name">IVAN VASHCHENKO</Link>
    <nav className="footer-links" aria-label="Footer">
      <a href={contact.linkedin.href} target="_blank" rel="noopener noreferrer">LINKEDIN ↗</a>
      <a href={contact.github.href} target="_blank" rel="noopener noreferrer">GITHUB ↗</a>
      <a href={contact.email.href}>EMAIL ↗</a>
      <Link to="/contact">CONTACT →</Link>
    </nav>
    <span className="footer-copyright mono">© {new Date().getFullYear()}</span>
  </footer>
}
