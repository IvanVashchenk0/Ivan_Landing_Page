import { useEffect, useRef, useState } from 'react'

type SafariVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

export function ThermalPipelineVideo({ src, poster }: { src: string; poster: string }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [approached, setApproached] = useState(false)
  const [visible, setVisible] = useState(false)
  const [requested, setRequested] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const approachObserver = new IntersectionObserver(([entry], observer) => {
      if (entry.isIntersecting) { setApproached(true); observer.disconnect() }
    }, { rootMargin: '600px 0px' })
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      const nextVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2
      setVisible(nextVisible)
      if (!nextVisible) videoRef.current?.pause()
    }, { threshold: [0, 0.2] })
    updateMotion()
    approachObserver.observe(frame)
    visibilityObserver.observe(frame)
    motion.addEventListener('change', updateMotion)
    return () => { approachObserver.disconnect(); visibilityObserver.disconnect(); motion.removeEventListener('change', updateMotion) }
  }, [])

  const shouldLoad = requested || (approached && !reducedMotion)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !shouldLoad) return
    if (!video.hasAttribute('src')) { video.src = src; video.load() }
    if (!document.hidden && visible) void video.play().catch(() => undefined)
  }, [shouldLoad, src, visible])

  useEffect(() => {
    const syncPlayback = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden || !visible) video.pause()
      else if (shouldLoad) void video.play().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', syncPlayback)
    return () => document.removeEventListener('visibilitychange', syncPlayback)
  }, [shouldLoad, visible])

  const loadAndPlay = () => {
    setRequested(true)
    setFailed(false)
    const video = videoRef.current
    if (!video?.hasAttribute('src')) return
    video.load()
    if (visible) void video.play().catch(() => undefined)
  }
  const replay = () => {
    const video = videoRef.current
    if (!video) return
    setRequested(true); setFailed(false)
    if (!video.hasAttribute('src')) return
    video.currentTime = 0
    if (visible) void video.play().catch(() => undefined)
  }
  const fullscreen = async () => {
    const video = videoRef.current as SafariVideo | null
    if (!video) return
    if (video.requestFullscreen) await video.requestFullscreen()
    else video.webkitEnterFullscreen?.()
  }

  return <div ref={frameRef} className="thermal-home-video-frame" data-loaded={shouldLoad}>
    <video ref={videoRef} poster={poster} muted loop playsInline preload="none" aria-label="Thermal Home Modeling computational pipeline recording" onError={() => { if (videoRef.current?.hasAttribute('src')) setFailed(true) }} />
    {!shouldLoad && <button className="thermal-home-video-play mono" type="button" onClick={loadAndPlay}>PLAY VIDEO</button>}
    {failed && <div className="thermal-home-video-error mono" role="status">VIDEO COULD NOT BE LOADED. <button type="button" onClick={loadAndPlay}>RETRY</button></div>}
    <div className="thermal-home-video-controls mono">
      <button type="button" onClick={replay}>REPLAY</button>
      <button type="button" onClick={() => void fullscreen()}>FULLSCREEN</button>
    </div>
  </div>
}
