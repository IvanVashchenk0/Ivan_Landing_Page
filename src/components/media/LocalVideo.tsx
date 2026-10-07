import { mediaUrl } from '../../data/media/config'
import { useEffect, useRef, useState } from 'react'
import { ivanMedia, type VideoRecord } from '../../data/editorial/index'

export function LocalVideo({ record }: { record: VideoRecord }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (started && !failed) void ref.current?.play().catch(() => { /* Native play remains available. */ })
  }, [started, attempt, failed])
  useEffect(() => {
    const video = ref.current
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video?.pause() })
    if (video) observer.observe(video)
    const hidden = () => { if (document.hidden) video?.pause() }
    document.addEventListener('visibilitychange', hidden)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', hidden) }
  }, [])
  return <>
    <div className="ivan-video-stage">
      <video ref={ref} className="ivan-local-video" controls={started} playsInline preload="none" poster={ivanMedia(record.image)}
        src={started ? `${mediaUrl(record.video)}${attempt ? `?retry=${attempt}` : ''}` : undefined}
        aria-label={record.playerLabel ?? record.title} onError={() => setFailed(true)} />
      {!started && <button className="ivan-play-button" type="button" aria-label={record.playLabel ?? `Play ${record.title}`} onClick={() => setStarted(true)}><span aria-hidden="true">▶</span></button>}
    </div>
    {failed && <div className="ivan-video-error" role="status">The clip could not load.<button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Retry video</button></div>}
    <a className="source-link" href={record.href} target="_blank" rel="noreferrer">OPEN ORIGINAL POST ↗</a>
  </>
}
