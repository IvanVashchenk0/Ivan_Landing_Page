import { categoryConfig } from '../data/navigation/categories'
import { Suspense } from 'react'
import { Link, useParams } from 'react-router'
import { projects, type ProjectData } from '../data/projects/index'
import { ProjectPreview } from '../components/project/ProjectPreview'
import { ProjectContent } from '../components/project/ProjectContent'
import { ProjectNavigation } from '../components/project/ProjectNavigation'
import { NotFound } from './NotFound'

export function Project() {
  const { projectId } = useParams()
  const project = projects.find(item => item.route === `/projects/${projectId}`)
  return project ? <ProjectPage project={project} /> : <NotFound />
}

export function ProjectPage({ project, registry }: { project: ProjectData; registry?: ProjectData[] }) {
  const Content = project?.DetailedContent
  return <>
    <div className={`project-detail theme-${project.theme}${!project.experience ? ' portfolio-new-project' : ''}`}>
      <Link to={categoryConfig(project.category).href} className="back-link mono">← BACK TO {categoryConfig(project.category).label}</Link>
      <div className="section-topline mono"><span>{String(project.order).padStart(2, '0')} / {categoryConfig(project.category).label}</span>{project.status && <span className="status"><i />{project.status}</span>}</div>
      <div className="project-heading"><h1>{project.title}</h1>{project.description && <p>{project.description}</p>}</div>
      {!project.projectPage?.hidePrimaryExperience && <ProjectPreview key={project.id} project={project} primary />}
    </div>
    {Content ? <Suspense fallback={<div className="experience-loading mono">Loading project details…</div>}><Content /></Suspense> : <ProjectContent project={project} />}
    <ProjectNavigation project={project} registry={registry} />
  </>
}
