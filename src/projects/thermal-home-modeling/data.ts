import type { ProjectDefinition } from '../../types/project'

export default {
  id: 'thermal-home-modeling',
  title: 'THERMAL HOME MODELING',
  category: 'me',
  order: 3,
  previewType: 'component',
  preview: { load: () => import('./Preview'), primaryLoad: () => import('./PrimaryPlaceholder') },
  experience: 'thermal-home-modeling',
  media: [{ kind: 'remote', id: 'thermal-home.preview' }, { kind: 'local', path: 'media/projects/thermal-home-modeling/pipeline-poster.webp' }],
  theme: 'light',
} satisfies ProjectDefinition
