import { categoryConfig } from '../../data/navigation/categories'
import { Link } from 'react-router'
import type { ProjectData } from '../../data/projects/index'
import { Arrow } from '../ui/Arrow'
import { ProjectPreview } from './ProjectPreview'

export function ProjectSection({ project, index, categoryPage = false, minimal = false }: { project: ProjectData; index: number; categoryPage?: boolean; minimal?: boolean }) {
  const newProject = !project.experience
  const categoryIdentifier = [categoryConfig(project.category).label, newProject ? project.eyebrow : undefined].filter(Boolean).join(' / ')
  return <section className={`project-section project-${project.experience ?? project.id} theme-${project.theme}${newProject ? ' portfolio-new-project' : ''}${minimal ? ' home-project' : ''}`} id={project.id} aria-labelledby={`${project.id}-title`}>
    {!minimal && <div className="section-topline mono"><span><span className="section-number">{String(index + 1).padStart(2, '0')}</span>{categoryPage ? `/ ${categoryIdentifier}` : project.eyebrow}</span>{project.status && <span className="status"><i />{project.status}</span>}</div>}
    <div className="project-heading"><h2 id={`${project.id}-title`}><Link to={project.route}>{newProject ? <span>{project.title}</span> : project.title}<Arrow diagonal /></Link></h2>{!minimal && project.description && <p>{project.description}</p>}</div>
    <ProjectPreview project={project} />
    <div className="section-bottomline">{!minimal && <span className="mono interaction-note">{project.interaction && <><span aria-hidden="true">↳</span>{project.interaction}</>}</span>}<Link className="text-link" to={project.route}>EXPLORE PROJECT<Arrow diagonal /></Link></div>
  </section>
}
