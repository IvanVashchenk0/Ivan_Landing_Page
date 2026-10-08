import type { ProjectDefinition } from '../../types/project'

export default {
  id: 'ahu-digitalization',
  title: 'AHU DIGITALIZATION PIPELINE',
  category: 'me',
  order: 2,
  previewType: 'component',
  preview: { load: () => import('./Preview') },
  projectPage: { loadContent: () => import('./ProjectContent'), hidePrimaryExperience: true },
  experience: 'ahu-digitalization',
  media: [
    { kind: 'remote', id: 'ahu.preview' },
    { kind: 'remote', id: 'ahu.scanning' },
    { kind: 'remote', id: 'ahu.model-generation' },
    { kind: 'remote', id: 'ahu.application' },
    { kind: 'remote', id: 'ahu.engineering-output' },
    { kind: 'remote', id: 'ahu.complete-pipeline' },
  ],
  theme: 'light',
} satisfies ProjectDefinition
