import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  poster: string
  label: string
  autoplay?: boolean
  loop?: boolean
}

export function TechnicalVideo({ src, poster, label, autoplay = false, loop = false }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const channelId = useRef({})
  const resumeAt = useRef(0)
  const [visible, setVisible] = useState(false)
  const [autoplayVisible, setAutoplayVisible] = useState(false)
  const [requested, setRequested] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      setAutoplayVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2)
    }, { threshold: [0, 0.2] })
    updateMotion()
    observer.observe(frame)
    motion.addEventListener('change', updateMotion)
    return () => { observer.disconnect(); motion.removeEventListener('change', updateMotion) }
  }, [])

  useEffect(() => {
    const release = (event: Event) => {
      if ((event as CustomEvent).detail !== channelId.current) setRequested(false)
    }
    window.addEventListener('image-recognition-video-activate', release)
    return () => window.removeEventListener('image-recognition-video-activate', release)
  }, [])

  const shouldLoad = requested || (autoplay && autoplayVisible && !reducedMotion)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!shouldLoad) {
      if (video.hasAttribute('src')) {
        resumeAt.current = video.currentTime
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      return
    }
    if (!video.hasAttribute('src')) { video.src = src; video.load() }
    const restore = () => {
      if (resumeAt.current > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(resumeAt.current, Math.max(0, video.duration - 0.1))
      resumeAt.current = 0
      if (visible && !document.hidden && (autoplay || requested)) void video.play().catch(() => undefined)
      else video.pause()
    }
    if (video.readyState > 0) restore()
    else video.addEventListener('loadedmetadata', restore, { once: true })
    return () => video.removeEventListener('loadedmetadata', restore)
  }, [autoplay, requested, shouldLoad, src, visible])

  useEffect(() => {
    const syncVisibility = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) video.pause()
      else if (visible && shouldLoad && (autoplay || requested)) void video.play().catch(() => undefined)
      else video.pause()
    }
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [autoplay, requested, shouldLoad, visible])

  const replay = () => {
    setVisible(true)
    setRequested(true)
    window.dispatchEvent(new CustomEvent('image-recognition-video-activate', { detail: channelId.current }))
    const video = videoRef.current
    if (!video) return
    if (!video.hasAttribute('src')) { video.src = src; video.load() }
    if (video.readyState > 0) video.currentTime = 0
    void video.play().catch(() => undefined)
  }
  const expand = () => {
    const video = videoRef.current
    if (!video) return
    setVisible(true)
    setRequested(true)
    window.dispatchEvent(new CustomEvent('image-recognition-video-activate', { detail: channelId.current }))
    if (!video.hasAttribute('src')) { video.src = src; video.load() }
    void video.requestFullscreen?.()
  }

  return <div ref={frameRef} className="image-recognition-video-frame">
    <video
      ref={videoRef}
      poster={poster}
      muted={autoplay}
      loop={loop}
      playsInline
      preload="none"
      controls={requested || !autoplay}
      aria-label={label}
      onPlaying={() => { setPlaying(true); setFailed(false) }}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onError={() => { if (videoRef.current?.hasAttribute('src')) setFailed(true) }}
    />
    {!shouldLoad && <button className="image-recognition-poster-action mono" type="button" onClick={replay}>
      {reducedMotion || !autoplay ? 'PLAY DEMONSTRATION' : 'LOAD DEMONSTRATION'}
    </button>}
    {failed && <div className="image-recognition-video-error mono" role="status">VIDEO COULD NOT BE LOADED. <button type="button" onClick={replay}>RETRY</button></div>}
    <div className="image-recognition-video-controls mono">
      <button type="button" onClick={replay}>REPLAY</button>
      <button type="button" onClick={expand}>EXPAND</button>
      <span aria-live="polite">{playing ? 'PLAYING' : 'PAUSED'}</span>
    </div>
  </div>
}
