import type { ProjectDefinition } from '../../types/project'

export default {
    id: 'pentimento', title: 'PENTIMENTO', category: 'ai', featured: true, order: 2,
    previewType: 'component', media: [{ kind: 'remote', id: 'pentimento.model-binary-repacked' }, { kind: 'remote', id: 'pentimento.input-video-web' }], preview: { load: () => import('./index'), preload: { margin: 1200, load: () => Promise.all([import('./index'), import('./viewerCode').then(module => module.preloadModelViewer())]) } }, featuredOrder: 2,
    experience: 'pentimento', eyebrow: 'Artificial intelligence / Spatial records',
    description: 'Every object has a story. Look a little closer.',
    interaction: 'Explore the object', status: '3D reconstruction', theme: 'dark',
    details: [
      { label: 'The idea', text: 'Explore a property record through the object itself, connecting its physical form to its history.' },
      { label: 'Input and output', text: 'Switch between the phone walkthrough and its reconstructed 3D scene. Inspect the original geometry and textures from the supplied reconstruction.' },
      { label: 'Further material', text: 'The capture pipeline, custody and integrity concepts, and supporting project material will be collected here.' },
    ],
  } satisfies ProjectDefinition
