import { resolveMedia } from '../../data/media/config'
import type { ProjectData, PreviewMedia } from '../../data/projects/index'
import { ProjectExperience } from './ProjectExperience'
import './portfolio.css'

export function ProjectPlaceholder({ title, primary = false }: { title: string; primary?: boolean }) {
  return <div className="portfolio-placeholder" role="group" aria-label={`${title} ${primary ? 'primary media' : 'preview'} in development`}>
    <span className="mono">{primary ? 'PROJECT CASE STUDY IN DEVELOPMENT' : 'PREVIEW IN DEVELOPMENT'}</span>
    <p>{primary ? 'Primary project media will live here.' : 'Project media will live here.'}</p>
  </div>
}

export function ProjectMedia({ media }: { media: PreviewMedia }) {
  return <figure className={`portfolio-media portfolio-media-${media.kind}`}>
    {media.kind === 'image' ? <img src={resolveMedia(media.src)} alt={media.alt} loading="lazy" />
      : media.kind === 'video' ? <video src={resolveMedia(media.src)} poster={media.poster ? resolveMedia(media.poster) : undefined} controls playsInline preload="metadata" aria-label={media.title} />
      : <div className="portfolio-audio"><span className="mono">{media.title}</span><audio src={resolveMedia(media.src)} controls preload="metadata" aria-label={media.title} /></div>}
    {media.caption && <figcaption>{media.caption}</figcaption>}
  </figure>
}

export function ProjectPreview({ project, primary = false }: { project: ProjectData; primary?: boolean }) {
  if (project.previewType === 'component') {
    if (project.preview) return <ProjectExperience experience={project.preview} id={project.experience ?? project.id} component={(primary ? project.PrimaryExperience : project.PreviewExperience)!} />
    const Component = project.previewComponent
    return <div className="experience"><Component /></div>
  }
  return <div className="experience portfolio-preview-slot">{project.previewType === 'media'
    ? <ProjectMedia media={project.previewMedia} />
    : <ProjectPlaceholder title={project.title} primary={primary} />}</div>
}
