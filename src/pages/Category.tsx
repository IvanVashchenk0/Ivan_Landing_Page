import { Link } from 'react-router'
import { getProjectsByCategory, type ProjectCategory } from '../data/projects/index'
import { categories } from '../data/navigation/categories'
import { Arrow } from '../components/ui/Arrow'
import { ProjectSection } from '../components/project/ProjectSection'

export function Category({ category }: { category: ProjectCategory }) {
  const item = categories.find(link => link.id === category)!
  const projects = getProjectsByCategory(category)
  return <>
    <div className="page-intro category-intro">
      <Link to="/" className="back-link mono">← BACK TO INDEX</Link>
      <div className="page-kicker mono">{item.fullLabel}</div>
      <h1>{item.label}<span className="name-dot">.</span></h1>
      <div className="page-intro-bottom"><p>{item.introduction}</p><span className="mono">{String(projects.length).padStart(2, '0')} EXPLORATIONS <Arrow /></span></div>
    </div>
    {projects.map((project, index) => <ProjectSection key={project.id} project={project} index={index} categoryPage />)}
  </>
}
