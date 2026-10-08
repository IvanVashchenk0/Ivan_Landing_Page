import type { ProjectDefinition } from '../../types/project'

export default {
  id: 'image-recognition',
  title: 'IMAGE RECOGNITION — CONSTRUCTION INDUSTRY',
  category: 'ai',
  order: 4,
  previewType: 'component',
  preview: { load: () => import('./Preview') },
  projectPage: { loadContent: () => import('./ProjectContent') },
  experience: 'image-recognition',
  media: [
    { kind: 'remote', id: 'image-recognition.full-pipeline' },
    { kind: 'remote', id: 'image-recognition.similarity' },
    { kind: 'remote', id: 'image-recognition.concurrent-processing' },
    { kind: 'local', path: 'media/projects/image-recognition/blur-diagram.webp' },
  ],
  eyebrow: 'Artificial intelligence / Construction image analysis',
  description: 'A technical image pipeline for quality filtering, visual comparison, and coordinated dataset work.',
  interaction: 'Play the complete pipeline',
  status: 'Technical demonstration',
  theme: 'light',
} satisfies ProjectDefinition
