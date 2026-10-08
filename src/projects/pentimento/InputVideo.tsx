import { useEffect, useRef, useState } from 'react'
import { PENTIMENTO_INPUT_VIDEO, PENTIMENTO_PLAYBACK_RATE, PENTIMENTO_INPUT_POSTER } from './media'

export type VideoReadiness = { playing: boolean; stalled: boolean; bufferedAhead: number; fullyBuffered: boolean }
export function InputVideo({ active, onReadiness }: { active: boolean; onReadiness?: (state: VideoReadiness) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readiness = useRef(onReadiness)
  useEffect(() => { readiness.current = onReadiness }, [onReadiness])
  const resumeTime = useRef(0)
  const [failed, setFailed] = useState(false)
  const [pausedByUser, setPausedByUser] = useState(false)
  const [playRequested, setPlayRequested] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let visible = false, stalled = true
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const bufferState = () => {
      let bufferedAhead = 0
      for (let i=0; i<video.buffered.length; i++) if (video.buffered.start(i) <= video.currentTime + .1 && video.buffered.end(i) > video.currentTime) bufferedAhead = video.buffered.end(i) - video.currentTime
      const fullyBuffered = Number.isFinite(video.duration) && video.buffered.length > 0 && video.buffered.start(0) < .1 && video.buffered.end(video.buffered.length-1) >= video.duration - .15
      return { playing: !video.paused && !video.ended && video.readyState >= 3, stalled, bufferedAhead, fullyBuffered }
    }
    const report = () => readiness.current?.(bufferState())
    const syncPlayback = () => {
      video.defaultPlaybackRate = PENTIMENTO_PLAYBACK_RATE
      video.playbackRate = PENTIMENTO_PLAYBACK_RATE
      if (!active) {
        video.pause()
        // pause() alone does not cancel buffering. Retain a fully buffered clip; otherwise
        // release its request and restore its position on return (HTTP caching remains available).
        if (video.hasAttribute('src') && !bufferState().fullyBuffered) {
          resumeTime.current = video.currentTime
          video.removeAttribute('src'); video.load()
        }
      } else if (visible && !document.hidden) {
        if (!motion.matches || playRequested) {
          if (!video.hasAttribute('src')) video.src = PENTIMENTO_INPUT_VIDEO
          if (!pausedByUser) void video.play().catch(() => { /* Poster and Play control remain available. */ })
        } else video.pause()
      } else video.pause()
      report()
    }
    const onMetadata = () => {
      if (resumeTime.current && Number.isFinite(video.duration)) video.currentTime = Math.min(resumeTime.current, Math.max(0,video.duration-.1))
      resumeTime.current = 0
      syncPlayback()
    }
    const onPlaying = () => { stalled = false; if (!active || !visible || document.hidden) video.pause(); report() }
    const onWaiting = () => { stalled = true; report() }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback() })
    observer.observe(video)
    video.addEventListener('loadedmetadata', onMetadata)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('stalled', onWaiting)
    video.addEventListener('progress', report)
    video.addEventListener('timeupdate', report)
    video.addEventListener('pause', report)
    document.addEventListener('visibilitychange', syncPlayback)
    motion.addEventListener('change', syncPlayback)
    syncPlayback()
    return () => {
      observer.disconnect()
      video.removeEventListener('loadedmetadata', onMetadata)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('stalled', onWaiting)
      video.removeEventListener('progress', report)
      video.removeEventListener('timeupdate', report)
      video.removeEventListener('pause', report)
      document.removeEventListener('visibilitychange', syncPlayback)
      motion.removeEventListener('change', syncPlayback)
      video.pause()
    }
  }, [active, pausedByUser, playRequested])

  const togglePlayback = () => {
    if (playing) { setPausedByUser(true); videoRef.current?.pause() }
    else {
      setPausedByUser(false); setPlayRequested(true)
      const video = videoRef.current
      if (video) { if (!video.hasAttribute('src')) video.src = PENTIMENTO_INPUT_VIDEO; void video.play().catch(() => undefined) }
    }
  }
  return <>
    <div className="pentimento-visual">
      <video ref={videoRef} poster={PENTIMENTO_INPUT_POSTER} className="pentimento-video" muted loop playsInline preload="metadata" aria-label="Pentimento input phone walkthrough, accelerated five times in the recording" onError={() => setFailed(true)} onPlaying={() => { setPlaying(true); setFailed(false) }} onPause={() => setPlaying(false)} />
      {failed && <div className="pentimento-video-status mono" role="status">INPUT VIDEO COULD NOT BE LOADED.</div>}
    </div>
    <div className="viewer-bottom">
      <span className="mono viewer-hint">INPUT / PHONE VIDEO / 5× CAPTURE</span>
      <div className="viewer-controls"><button onClick={togglePlayback} aria-label={playing ? 'Pause input video' : 'Play input video'}>{playing ? 'Pause' : 'Play'}<span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span></button></div>
    </div>
  </>
}
