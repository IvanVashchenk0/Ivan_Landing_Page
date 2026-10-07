import { useEffect, useRef, useState } from 'react'
import { PREVIEW_DURATION } from './previewTimeline'

// Preview-specific clock. The long system walkthrough keeps its own playback.
export function usePreviewPlayback() {
  const stageRef = useRef<HTMLDivElement>(null)
  const time = useRef(0)
  const started = useRef(false)
  const visibleNow = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const complete = elapsed >= PREVIEW_DURATION
  useEffect(() => {
    let inView = false
    const sync = () => {
      visibleNow.current = inView && !document.hidden
      setVisible(visibleNow.current)
      if (visibleNow.current && !started.current) { started.current = true; setPlaying(true) }
    }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting && entry.intersectionRatio >= .4; sync() }, { threshold: [0, .4] })
    if (stageRef.current) observer.observe(stageRef.current)
    document.addEventListener('visibilitychange', sync)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', motionChange)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', motionChange) }
  }, [])
  useEffect(() => {
    if (!playing || !visible || complete) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      if (visibleNow.current && !document.hidden) time.current = Math.min(PREVIEW_DURATION, time.current + Math.max(0, now - previous))
      previous = now
      setElapsed(time.current)
      if (time.current < PREVIEW_DURATION) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, visible, complete])
  const replay = () => { started.current = true; time.current = 0; setElapsed(0); setPlaying(true) }
  const skip = () => { started.current = true; time.current = PREVIEW_DURATION; setElapsed(PREVIEW_DURATION); setPlaying(false) }
  const toggle = () => { started.current = true; setPlaying(value => !value) }
  return { stageRef, elapsed, playing, advancing: playing && visible && !complete, complete, reducedMotion, replay, skip, toggle }
}
