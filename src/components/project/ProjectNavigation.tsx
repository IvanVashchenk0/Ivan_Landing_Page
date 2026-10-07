import { categoryConfig } from '../../data/navigation/categories'
import { Link } from 'react-router'
import { getProjectNeighbors, type ProjectData } from '../../data/projects/index'
import { Arrow } from '../ui/Arrow'

export function ProjectNavigation({ project, registry }: { project: ProjectData; registry?: ProjectData[] }) {
  const { previous, next } = getProjectNeighbors(project, registry)
  return <nav className="portfolio-project-navigation" aria-label="Project navigation">
    {previous ? <Link className="portfolio-project-link" to={previous.route} rel="prev"><span className="mono">PREVIOUS PROJECT</span><span><Arrow className="portfolio-previous-arrow" />{previous.title}</span></Link>
      : <div className="portfolio-project-boundary"><span className="mono">PREVIOUS PROJECT</span><span>Start of {categoryConfig(project.category).label} portfolio</span></div>}
    {next ? <Link className="portfolio-project-link" to={next.route} rel="next"><span className="mono">NEXT PROJECT</span><span>{next.title}<Arrow /></span></Link>
      : <div className="portfolio-project-boundary"><span className="mono">NEXT PROJECT</span><span>End of {categoryConfig(project.category).label} portfolio</span></div>}
  </nav>
}
