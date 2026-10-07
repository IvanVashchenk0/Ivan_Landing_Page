import type { ComponentType } from 'react'
import type { ProjectCategory } from '../data/navigation/categories'
import type { MediaReference } from '../data/media/config'
export type { ProjectCategory } from '../data/navigation/categories'
export type ComponentLoader = () => Promise<{ default: ComponentType }>
export interface ExperienceDefinition {
  load: ComponentLoader
  primaryLoad?: ComponentLoader
  preload?: { margin: number; load: () => Promise<unknown> }
}
export type PreviewMedia =
  | { kind: 'image'; src: MediaReference; alt: string; caption?: string }
  | { kind: 'video'; src: MediaReference; title: string; poster?: MediaReference; caption?: string }
  | { kind: 'audio'; src: MediaReference; title: string; caption?: string }
export interface ProjectContentSection {
  id: string
  title: string
  text?: string
  media?: PreviewMedia
  links?: { label: string; href: string }[]
}
type ProjectPreview =
  | { previewType: 'component'; preview: ExperienceDefinition; previewComponent?: never; previewMedia?: never }
  | { previewType: 'component'; previewComponent: ComponentType; preview?: never; previewMedia?: never }
  | { previewType: 'media'; previewMedia: PreviewMedia; preview?: never; previewComponent?: never }
  | { previewType: 'placeholder'; preview?: never; previewMedia?: never; previewComponent?: never }
export type ProjectDefinition = ProjectPreview & {
  id: string
  slug?: string
  title: string
  category: ProjectCategory
  order: number
  route?: `/projects/${string}`
  featured?: boolean
  featuredOrder?: number
  // Existing exhibit style identifier; it no longer dispatches project logic.
  experience?: string
  projectPage?: { loadContent: ComponentLoader }
  media?: MediaReference[]
  metadata?: { year?: number; links?: { label: string; href: string }[] }
  eyebrow?: string
  description?: string
  interaction?: string
  status?: string
  theme?: 'light' | 'dark'
  details?: { label: string; text: string }[]
  sections?: ProjectContentSection[]
}
export type ProjectData = ProjectDefinition & { PreviewExperience?: ComponentType; PrimaryExperience?: ComponentType; DetailedContent?: ComponentType; slug: string; route: `/projects/${string}`; theme: 'light' | 'dark'; details: { label: string; text: string }[] }
