import { Link } from 'react-router'
import { socialLinks } from '../../data/navigation/index'

export function Footer() {
  return <footer className="site-footer" id="footer">
    <Link to="/" className="footer-name">IVAN VASHCHENKO<span className="mono">AN ONGOING EXPLORATION.</span></Link>
    <div className="footer-socials">
      <div className="social-links">{socialLinks.map(link => link.href
        ? <a key={link.label} href={link.href} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{link.label} ↗</a>
        : <span key={link.label} className="unconfigured-link" title="Link coming soon">{link.label} ↗</span>)}</div>
      {socialLinks.every(link => !link.href) && <span className="mono footer-note">LINKS COMING SOON</span>}
    </div>
    <span className="footer-version mono">© {new Date().getFullYear()} / V0.1</span>
  </footer>
}
