import type { ProjectData } from '../../data/projects/index'
import { ProjectMedia } from './ProjectPreview'

export function ProjectContent({ project }: { project: ProjectData }) {
  const sections = project.sections?.filter(section => section.text || section.media || section.links?.length) ?? []
  if (sections.length) return <div className="portfolio-case-study">{sections.map(section => <section key={section.id} aria-labelledby={`${project.id}-${section.id}`}>
    <h2 id={`${project.id}-${section.id}`}>{section.title}</h2>
    {section.text && <p>{section.text}</p>}
    {section.media && <ProjectMedia media={section.media} />}
    {!!section.links?.length && <ul>{section.links.map(link => <li key={link.href}><a className="text-link" href={link.href}>{link.label}</a></li>)}</ul>}
  </section>)}</div>
  if (project.details.length) return <div className="project-details">{project.details.map((detail, index) => <div key={detail.label}><span className="mono">{String(index + 1).padStart(2, '0')} / {detail.label}</span><p>{detail.text}</p></div>)}</div>
  return <p className="portfolio-case-study-note">Additional project material will be added here.</p>
}
