import { contact, contactDirectory, linkedinProfile } from '../data/contact'
import { localMedia } from '../data/media/config'
import './contact.css'

export function Contact() {
  return <div className="contact-page">
    <header className="contact-heading"><h1>CONTACT<span className="name-dot">.</span></h1></header>

    <section className="linkedin-feature" aria-label="Featured LinkedIn profile">
      <a className="linkedin-card" href={contact.linkedin.href} target="_blank" rel="noopener noreferrer" aria-label="View Ivan Vashchenko on LinkedIn">
        <div className="linkedin-visual">
          <img className="linkedin-banner" src={localMedia(linkedinProfile.banner)} alt="Ivan Vashchenko LinkedIn banner for Engineering Automation and AI Systems" width="1920" height="480" />
          <div className="linkedin-photo-frame"><img className="linkedin-photo" src={localMedia(linkedinProfile.profile)} alt="Ivan Vashchenko" width="1200" height="800" /></div>
        </div>
        <div className="linkedin-content">
          <span className="mono linkedin-label">LINKEDIN</span>
          <h2>{linkedinProfile.name}</h2>
          <p className="linkedin-headline">{linkedinProfile.headline}</p>
          <p className="linkedin-affiliations"><span>{linkedinProfile.organization}</span><span>{linkedinProfile.college}</span></p>
          <span className="linkedin-address">{contact.linkedin.displayValue}</span>
          <span className="linkedin-action mono">VIEW PROFILE ↗</span>
        </div>
      </a>
    </section>

    <address className="contact-directory" aria-label="Contact directory">
      {contactDirectory.map(method => <a key={method.id} className="contact-row" href={method.href} target={method.external ? '_blank' : undefined} rel={method.external ? 'noopener noreferrer' : undefined} aria-label={`${method.label}: ${method.displayValue}`}>
        <span className="mono contact-label">{method.label}</span>
        <span className="contact-value">{method.displayValue}</span>
        <span className="contact-arrow" aria-hidden="true">{method.external ? '↗' : '→'}</span>
      </a>)}
    </address>
  </div>
}
