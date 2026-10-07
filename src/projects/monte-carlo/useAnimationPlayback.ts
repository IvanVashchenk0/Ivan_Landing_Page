import { useEffect, useRef, useState } from 'react'
import { TOTAL_DURATION } from './timeline'

export function useAnimationPlayback() {
  const stageRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef(0)
  const started = useRef(false)
  const visibleRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const complete = elapsed >= TOTAL_DURATION

  useEffect(() => {
    let inView = false
    const sync = () => {
      const nowVisible = inView && !document.hidden
      visibleRef.current = nowVisible
      setVisible(nowVisible)
      if (nowVisible && !started.current) { started.current = true; setPlaying(true) }
    }
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting && entry.intersectionRatio >= .35; sync() }, { threshold: [0, .35] })
    if (stageRef.current) observer.observe(stageRef.current)
    document.addEventListener('visibilitychange', sync)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', motionChange)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', motionChange) }
  }, [])

  useEffect(() => {
    if (!playing || !visible || complete) return
    let request = 0
    let previous = performance.now()
    const tick = (now: number) => {
      // Guard the frame itself too: a visibility event can precede React effect cleanup.
      if (visibleRef.current && !document.hidden) elapsedRef.current = Math.min(TOTAL_DURATION, elapsedRef.current + Math.max(0, now - previous))
      previous = now
      setElapsed(elapsedRef.current)
      if (elapsedRef.current < TOTAL_DURATION) request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, visible, complete])

  const replay = () => { started.current = true; elapsedRef.current = 0; setElapsed(0); setPlaying(true) }
  const skip = () => { started.current = true; elapsedRef.current = TOTAL_DURATION; setElapsed(TOTAL_DURATION); setPlaying(false) }
  const toggle = () => { started.current = true; setPlaying(value => !value) }
  return { stageRef, elapsed, reducedMotion, complete, playing, advancing: playing && visible && !complete, replay, skip, toggle }
}
