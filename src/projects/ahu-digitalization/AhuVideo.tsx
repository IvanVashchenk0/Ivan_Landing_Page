import { useEffect, useRef, useState } from 'react'

const ACTIVATE_EVENT = 'ahu-video-activate'

type Props = {
  src: string
  poster: string
  label: string
  autoplay?: boolean
  loop?: boolean
  controls?: boolean
}

export function AhuVideo({ src, poster, label, autoplay = false, loop = false, controls = false }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const channelId = useRef({})
  const [visible, setVisible] = useState(false)
  const [requested, setRequested] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [owner, setOwner] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2), { threshold: [0, 0.2] })
    updateMotion()
    observer.observe(frame)
    motion.addEventListener('change', updateMotion)
    return () => { observer.disconnect(); motion.removeEventListener('change', updateMotion) }
  }, [])

  useEffect(() => {
    const deactivate = (event: Event) => {
      const current = (event as CustomEvent).detail === channelId.current
      setOwner(current)
      if (!current) setRequested(false)
    }
    window.addEventListener(ACTIVATE_EVENT, deactivate)
    return () => window.removeEventListener(ACTIVATE_EVENT, deactivate)
  }, [])

  useEffect(() => {
    if (autoplay && visible && !reducedMotion) window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: channelId.current }))
  }, [autoplay, reducedMotion, visible])

  const shouldLoad = requested || (autoplay && visible && !reducedMotion && owner)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!shouldLoad) {
      video.pause()
      if (video.hasAttribute('src')) {
        video.removeAttribute('src')
        video.load()
      }
      return
    }
    if (!video.hasAttribute('src')) {
      video.src = src
      video.load()
    }
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

  const play = () => {
    setRequested(true)
    setFailed(false)
    window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: channelId.current }))
  }

  return <div ref={frameRef} className="ahu-video-frame">
    <video
      ref={videoRef}
      poster={poster}
      muted={autoplay}
      loop={loop}
      playsInline
      preload="none"
      controls={controls && shouldLoad}
      aria-label={label}
      onError={() => { if (videoRef.current?.hasAttribute('src')) setFailed(true) }}
    />
    {!shouldLoad && <button className="ahu-video-play mono" type="button" onClick={play}>{autoplay ? 'PLAY VIDEO' : 'PLAY EXHIBIT'}</button>}
    {failed && <div className="ahu-video-error mono" role="status">VIDEO COULD NOT BE LOADED. <button type="button" onClick={play}>RETRY</button></div>}
  </div>
}
