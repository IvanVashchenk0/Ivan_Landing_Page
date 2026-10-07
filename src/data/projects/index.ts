import { lazy } from 'react'
import type { ProjectData, ProjectDefinition, ProjectCategory } from '../../types/project'
export type { ProjectData, ProjectDefinition, ProjectCategory, PreviewMedia, ProjectContentSection } from '../../types/project'
import project0 from '../../projects/argus/data'
import project1 from '../../projects/pentimento/data'
import project2 from '../../projects/monte-carlo/data'
import project3 from '../../projects/geoarbiter/data'
import project4 from '../../projects/image-recognition/data'
import project5 from '../../projects/voice-cloning/data'
import project6 from '../../projects/ecotrail/data'
import project7 from '../../projects/peggame-solver/data'
import project8 from '../../projects/autonomous-sorting/data'
import project9 from '../../projects/ahu-digitalization/data'
import project10 from '../../projects/thermal-home-modeling/data'
import project11 from '../../projects/quickscope/data'
import project12 from '../../projects/solar-car-linkage/data'
import project13 from '../../projects/digitally-manufactured-reactor/data'
import project14 from '../../projects/computational-chemistry/data'
import project15 from '../../projects/aerodynamics/data'
export function createProjectRegistry(definitions: readonly ProjectDefinition[]): ProjectData[] {
 const seen = new Set<string>(), routes = new Set<string>()
 return definitions.map(project => {
  const slug = project.slug ?? project.id
  const route = project.route ?? `/projects/${slug}`
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || route !== `/projects/${slug}`) throw new Error('Project slug must be lowercase and match its route')
  if (seen.has(project.id) || routes.has(route)) throw new Error('Duplicate project ID or route')
  seen.add(project.id); routes.add(route)
  return { ...project, PreviewExperience: project.preview ? lazy(project.preview.load) : undefined, PrimaryExperience: project.preview ? lazy(project.preview.primaryLoad ?? project.preview.load) : undefined, DetailedContent: project.projectPage ? lazy(project.projectPage.loadContent) : undefined, slug, route, theme: project.theme ?? 'light', details: project.details ?? [] }
 })
}
export const projects = createProjectRegistry([project0, project1, project2, project3, project4, project5, project6, project7, project8, project9, project10, project11, project12, project13, project14, project15])
export const selectFeaturedProjects = (items: readonly ProjectData[]) => items.filter(project => project.featured).sort((a,b) => (a.featuredOrder ?? a.order) - (b.featuredOrder ?? b.order))
export const featuredProjects = selectFeaturedProjects(projects)
export const getProjectsByCategory = (category: ProjectCategory, items: readonly ProjectData[] = projects) => items.filter(project => project.category === category).sort((a,b) => a.order - b.order)
export function getProjectNeighbors(project: ProjectData, items: readonly ProjectData[] = projects) {
 const categoryProjects = getProjectsByCategory(project.category, items)
 const index = categoryProjects.findIndex(item => item.id === project.id)
 return { previous: categoryProjects[index - 1], next: categoryProjects[index + 1] }
}
