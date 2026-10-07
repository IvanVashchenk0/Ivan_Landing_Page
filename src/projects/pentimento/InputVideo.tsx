import { useEffect, useRef, useState } from 'react'
import { PENTIMENTO_INPUT_VIDEO, PENTIMENTO_PLAYBACK_RATE } from './media'

export function InputVideo({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [needsPlay, setNeedsPlay] = useState(false)
  const [failed, setFailed] = useState(false)
  const [pausedByUser, setPausedByUser] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let visible = false
    let disposed = false
    const syncPlayback = () => {
      video.defaultPlaybackRate = PENTIMENTO_PLAYBACK_RATE
      video.playbackRate = PENTIMENTO_PLAYBACK_RATE
      if (active && visible && !document.hidden && !pausedByUser) {
        void video.play().then(() => { if (!disposed) setNeedsPlay(false) }).catch(error => {
          if (!disposed && error.name !== 'AbortError') setNeedsPlay(true)
        })
      } else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback() })
    const guardAutoplay = () => { if (!active || !visible || document.hidden) video.pause() }
    observer.observe(video)
    video.addEventListener('loadedmetadata', syncPlayback)
    video.addEventListener('canplay', syncPlayback)
    video.addEventListener('play', guardAutoplay)
    document.addEventListener('visibilitychange', syncPlayback)
    syncPlayback()
    return () => {
      disposed = true
      observer.disconnect()
      video.removeEventListener('loadedmetadata', syncPlayback)
      video.removeEventListener('canplay', syncPlayback)
      video.removeEventListener('play', guardAutoplay)
      document.removeEventListener('visibilitychange', syncPlayback)
      video.pause()
    }
  }, [active, pausedByUser])

  const togglePlayback = () => {
    if (playing) { setPausedByUser(true); videoRef.current?.pause() }
    else {
      setPausedByUser(false)
      void videoRef.current?.play().then(() => setNeedsPlay(false)).catch(() => setNeedsPlay(true))
    }
  }

  return <>
    <div className="pentimento-visual">
      <video ref={videoRef} src={PENTIMENTO_INPUT_VIDEO} className="pentimento-video" autoPlay={active} muted loop playsInline preload="metadata" aria-label="Pentimento input phone walkthrough, played at five times speed" onError={() => setFailed(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {failed && <div className="media-message mono" role="status">INPUT VIDEO COULD NOT BE LOADED.</div>}
    </div>
    <div className="viewer-bottom">
      <span className="mono viewer-hint">INPUT / PHONE VIDEO / {PENTIMENTO_PLAYBACK_RATE}×</span>
      {!failed && <div className="viewer-controls"><button onClick={togglePlayback} aria-label={playing ? 'Pause input video' : 'Play input video'}>{playing ? 'Pause' : needsPlay ? 'Play video' : 'Play'}<span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span></button></div>}
    </div>
  </>
}
