import type { ProjectDefinition } from '../../types/project'

export default {
    media: [{ kind: 'local', path: 'media/projects/argus/ARGUS%20Banner.png' }],
    id: 'argus', title: 'ARGUS', category: 'ai', featured: true, order: 1,
    previewType: 'component', preview: { load: () => import('./Preview'), primaryLoad: () => import('./index') }, projectPage: { loadContent: () => import('./ProjectContent') }, featuredOrder: 1,
    experience: 'argus', eyebrow: 'Artificial intelligence / Agent systems',
    description: 'Independent authorization for agentic commerce.',
    interaction: 'Follow the decision', status: 'Architecture animation', theme: 'light',
    details: [
      { label: 'The system', text: 'An independent authorization boundary between the shopping agent and payment access. The evaluator receives the original conversation, isolated from browsing instructions.' },
      { label: 'The trace', text: 'One architectural animation follows clean intent, policy, verification, deterministic routing, scoped payment authority, and an audit record. No live payment or API call is made.' },
      { label: 'Working product', text: 'The full project page includes the working product demonstration and implementation details.' },
    ],
  } satisfies ProjectDefinition
