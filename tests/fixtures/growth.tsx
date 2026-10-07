import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { projects, createProjectRegistry, getProjectsByCategory, selectFeaturedProjects, getProjectNeighbors } from '../../src/data/projects/index'
import { articles, orderedRecords, stripRecords } from '../../src/data/editorial/index'
import type { ProjectDefinition } from '../../src/types/project'
import type { IvanRecord } from '../../src/data/editorial/index'
import { ProjectPage } from '../../src/pages/Project'
import { ProjectSection } from '../../src/components/project/ProjectSection'
import { Ivan } from '../../src/pages/Ivan'
import { MaterialStrip } from '../../src/components/editorial/MaterialStrip'

const extra: ProjectDefinition = { id: 'test-seventeen', title: 'Test Seventeen', category: 'ai', order: 9, featured: true, featuredOrder: 0, previewType: 'component', preview: { load: async () => ({ default: () => <button>Test custom experience</button> }) }, projectPage: { loadContent: async () => ({ default: () => <p>Test detailed content</p> }) } }
const photograph: IvanRecord = { id: 'test-seven', kind: 'photograph', order: 7, stripOrder: 0, title: 'Test photograph', accessibleName: 'Test seventh record', image: 'argus-article.webp', imageAlt: 'Test uses an existing photograph', imageWidth: 800, imageHeight: 533 }
export const registry = createProjectRegistry([...projects, extra])
const records = [...articles, photograph]
export function inspectGrowth() {
  return { count: registry.length, order: getProjectsByCategory('ai', registry).map(p => p.id), featured: selectFeaturedProjects(registry).map(p => p.id), previous: getProjectNeighbors(registry.at(-1)!, registry).previous.id, editorial: orderedRecords(records).map(r => r.id), strip: stripRecords(records).map(r => r.id) }
}
export function mountGrowth(view: string) {
  const target = document.createElement('div'); document.body.appendChild(target)
  createRoot(target).render(<MemoryRouter>{view === 'project' ? <ProjectPage project={registry.at(-1)!} registry={registry}/> : view === 'preview' ? <ProjectSection project={registry.at(-1)!} index={8} categoryPage/> : view === 'strip' ? <MaterialStrip records={records}/> : <Ivan records={records}/>}</MemoryRouter>)
}
