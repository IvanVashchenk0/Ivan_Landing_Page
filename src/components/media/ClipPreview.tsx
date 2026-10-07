import { mediaUrl } from '../../data/media/config'
import { useEffect, useRef, useState } from 'react'
import { ivanMedia, type VideoRecord } from '../../data/editorial/index'

// Preview instances load only when visible. A shared position preserves the clip at a strip wrap.
export function ClipPreview({ record, paused, reduced, getPosition, onPosition }: { record: VideoRecord; paused: boolean; reduced: boolean; getPosition: (id: string) => number; onPosition: (id: string, position: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [attached, setAttached] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let inView = false
    const sync = () => {
      setVisible(inView && !document.hidden)
      if (inView && !document.hidden && !paused && !reduced) setAttached(true)
    }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting && entry.intersectionRatio >= .35; sync() }, { threshold: [0, .35] })
    if (ref.current) observer.observe(ref.current)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [paused, reduced])
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const play = visible && !paused && !reduced && !failed && attached
    if (play) {
      if (video.readyState >= 1 && Math.abs(video.currentTime - getPosition(record.id)) > .5) video.currentTime = getPosition(record.id)
      void video.play().catch(() => { /* The authentic poster remains if autoplay is unavailable. */ })
    } else video.pause()
  }, [visible, paused, reduced, attached, failed, getPosition, record.id])
  return <span className="material-clip">
    <img src={ivanMedia(record.image)} alt="" width="900" height="506" loading="lazy" />
    <video ref={ref} src={attached ? mediaUrl(record.video) : undefined} poster={ivanMedia(record.image)} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
      onLoadedMetadata={() => { if (ref.current) ref.current.currentTime = getPosition(record.id) }}
      onTimeUpdate={() => { if (visible && ref.current && !ref.current.paused) onPosition(record.id, ref.current.currentTime) }}
      onError={() => setFailed(true)} style={{ visibility: failed ? 'hidden' : 'visible' }} />
    <span className="material-play" aria-hidden="true">▶</span>
  </span>
}
