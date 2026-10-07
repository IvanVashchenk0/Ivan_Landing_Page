import { Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import type { ExperienceDefinition } from '../../types/project'

export function ProjectExperience({ experience, id, component: Experience }: { experience: ExperienceDefinition; id: string; component: ComponentType }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const preload = experience.preload
    if (!preload) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void preload.load().catch(() => { /* Explicit selection can retry code loading. */ })
        observer.disconnect()
      }
    }, { rootMargin: `${preload.margin}px` })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [experience])
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '250px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const placeholder = <div className="experience-loading mono">Preparing exploration<span className="loading-dot"> ·</span></div>
  return <div ref={ref} className={`experience experience-${id}`}>{visible ? <Suspense fallback={placeholder}><Experience /></Suspense> : placeholder}</div>
}
