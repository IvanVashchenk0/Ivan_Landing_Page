import type { ProjectDefinition } from '../../types/project'

export default {
  id: 'autonomous-sorting',
  title: 'AUTONOMOUS SORTING MACHINE',
  category: 'me',
  order: 1,
  previewType: 'component',
  preview: { load: () => import('./Preview') },
  projectPage: { loadContent: () => import('./ProjectContent'), hidePrimaryExperience: true },
  experience: 'autonomous-sorting',
  media: Array.from({ length: 14 }, (_, index) => ({
    kind: 'local' as const,
    path: `media/projects/autonomous-sorting/${String(index + 1).padStart(2, '0')}-${[
      'prototype-complete', 'prototype-side', 'mechanism-closeup', 'hopper-closeup', 'prototype-workbench', 'assembly-workbench',
      'cad-isometric', 'cad-front', 'cad-side', 'cad-top', 'vision-result', 'vision-result-alt', 'original-concept-sketch', 'cad-assembly-drawing',
    ][index]}.webp`,
  })),
  theme: 'light',
} satisfies ProjectDefinition
