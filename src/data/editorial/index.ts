import { localMedia, type RemoteMediaId } from '../media/config'
import profileText from './leadership-profile.txt?raw'

export type EditorialLayout = 'lead' | 'portrait' | 'wide' | 'text' | 'side' | 'spread'
interface RecordBase {
  order: number
  stripOrder?: number
  layout?: EditorialLayout
  imageWidth?: number
  imageHeight?: number
  imagePosition?: string
  id: string
  title: string
  accessibleName: string
  source?: string
  year?: number
  author?: string
  date?: string
}
export interface ArticleRecord extends RecordBase {
  kind: 'article'
  image: string
  imageAlt: string
  href: string
}
export interface DocumentRecord extends RecordBase {
  kind: 'document'
  image: string
  imageAlt: string
  companionImage?: string
  companionAlt?: string
  pdf: RemoteMediaId
  pageCount: number
  initialPage: number
}
export interface VideoRecord extends RecordBase {
  kind: 'video'
  playerLabel?: string
  playLabel?: string
  image: string
  video: RemoteMediaId
  href: string
}
export interface ProfileRecord extends RecordBase {
  kind: 'profile'
  paragraphs: string[]
}
export interface PhotographRecord extends RecordBase {
  kind: 'photograph'
  image: string
  imageAlt: string
  href?: string
}
export type IvanRecord = PhotographRecord | ArticleRecord | DocumentRecord | VideoRecord | ProfileRecord

// Shared source order. Metadata is included only when verified from the supplied source.
export const articles: IvanRecord[] = [
  {
    id: 'argus-infocus', order: 1, stripOrder: 1, layout: 'lead', imageWidth: 800, imageHeight: 533, kind: 'article',
    title: 'Principia College ACMC takes six awards in AI Hackathon',
    accessibleName: 'Open Argus Principia InFocus article', source: 'Principia College', year: 2026,
    href: 'https://www.principiacollege.edu/article/principia-college-acmc-takes-six-awards-in-ai-hackathon',
    image: 'argus-article.webp', imageAlt: 'Ivan presenting at the Principia College lectern.',
  },
  {
    id: 'engineering-newsletter', order: 2, stripOrder: 2, layout: 'portrait', imageWidth: 600, imageHeight: 776, kind: 'document', title: 'Engineering Newsletter',
    accessibleName: 'Open Engineering Newsletter', year: 2024,
    image: 'engineering-newsletter-preview.webp', imageAlt: 'Internship Spotlight: Ivan Vashchenko, from the Fall 2024 Engineering Newsletter.',
    pdf: 'editorial.engineering-newsletter', pageCount: 2, initialPage: 2,
  },
  {
    id: 'alumni-video', order: 3, stripOrder: 3, layout: 'wide', imageWidth: 900, imageHeight: 506, kind: 'video', title: 'Ivan Vashchenko',
    accessibleName: 'Open Ivan’s Principia alumni video',
    playerLabel: 'Ivan Vashchenko — Principia alumni video', playLabel: 'Play Ivan’s Principia alumni video',
    image: 'alumni-video-preview.webp', video: 'editorial.alumni-video',
    href: 'https://www.linkedin.com/posts/principiacollege_principia-principia-activity-7495164888697298944-SLKL',
  },
  {
    id: 'leadership-profile', order: 4, stripOrder: 4, layout: 'text', kind: 'profile', title: 'Ivan Vashchenko',
    accessibleName: 'Read Ivan Vashchenko’s leadership profile',
    paragraphs: profileText.trim().split(/\n\s*\n/),
  },
  {
    id: 'pentimento-infocus', order: 5, stripOrder: 5, layout: 'side', imageWidth: 1024, imageHeight: 768, imagePosition: 'center 65%', kind: 'article',
    title: 'Principia College Students Take First Place at WashU Hackathon',
    accessibleName: 'Open Pentimento Principia InFocus article', source: 'Principia College', year: 2026,
    href: 'https://www.principiacollege.edu/article/students-take-first-place-at-washu-hackathon',
    image: 'pentimento-article.webp', imageAlt: 'The Pentimento team with their first-place certificate at Washington University.',
  },
  {
    id: 'acmc-chronicle', order: 6, stripOrder: 6, layout: 'spread', imageWidth: 600, imageHeight: 776, kind: 'document', title: 'The ACMC Chronicle',
    accessibleName: 'Open The ACMC Chronicle', year: 2026,
    image: 'acmc-chronicle-preview.webp', imageAlt: 'The ACMC Chronicle, Spring 2026, Annual Edition No. 1.',
    companionImage: 'acmc-leadership-preview.webp', companionAlt: 'ACMC Leadership: Ivan Vashchenko, Founder & President.', pdf: 'editorial.acmc-chronicle', pageCount: 12, initialPage: 1,
  },
]

export const ivanMedia = (path: string) => localMedia(`media/editorial/${path}`)
export const recordFocusUrl = (id: string) => `/ivan?item=${encodeURIComponent(id)}`

export const orderedRecords = (records: IvanRecord[] = articles) => [...records].sort((a, b) => a.order - b.order)
export const stripRecords = (records: IvanRecord[] = articles) => records.filter(record => record.stripOrder !== undefined).sort((a, b) => a.stripOrder! - b.stripOrder!)
export const editorialLayout = (record: IvanRecord, index: number): EditorialLayout => record.layout ?? (['lead', 'portrait', 'wide', 'text', 'side', 'spread'] as const)[index % 6]
