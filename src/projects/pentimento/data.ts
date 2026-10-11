import type { ProjectDefinition } from '../../types/project'

export default {
    id: 'pentimento', title: 'PENTIMENTO', category: 'ai', featured: true, order: 2,
    previewType: 'component', media: [{ kind: 'remote', id: 'pentimento.model-binary-repacked' }, { kind: 'remote', id: 'pentimento.model-mobile' }, { kind: 'remote', id: 'pentimento.input-video-web' }, { kind: 'local', path: 'media/projects/pentimento/project-website.png' }, { kind: 'local', path: 'media/projects/pentimento/project-pitch-thumbnail.jpg' }], preview: { load: () => import('./index'), preload: { margin: 1200, load: () => Promise.all([import('./index'), import('./viewerCode').then(module => module.preloadModelViewer())]) } }, projectPage: { loadContent: () => import('./ProjectContent') }, featuredOrder: 2,
    experience: 'pentimento', eyebrow: 'Artificial intelligence / Spatial records',
    description: 'Every object has a story. Look a little closer.',
    interaction: 'Explore the object', status: '3D reconstruction', theme: 'dark',
    details: [],
  } satisfies ProjectDefinition
