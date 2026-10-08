import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { InputVideo, type VideoReadiness } from './InputVideo'

import { canPrefetchModel, pentimentoDesktopModelLoader } from './modelLoader'
import { preloadModelViewer } from './viewerCode'
import { ModelFallback } from './ModelPoster'
import { PENTIMENTO_MODEL_STILL } from './media'
import { canRenderFullModel, pentimentoModelVariant, type PentimentoModelVariant } from './capabilities'

function RequestedModel({ active, variant }: { active: boolean; variant: PentimentoModelVariant }) {
  const [Viewer, setViewer] = useState<ComponentType<{ active: boolean; variant: PentimentoModelVariant }> | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let mounted = true
    preloadModelViewer(variant === 'mobile').then(module => { if (mounted && module) setViewer(() => module.default) }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false }
  }, [attempt, variant])
  if (failed) return <ModelFallback failed variant={variant} retry={() => { setFailed(false); setAttempt(value => value + 1) }} />
  return Viewer ? <Viewer active={active} variant={variant} /> : <ModelFallback variant={variant} />
}

function prefetchDesktop(explicit = false) {
  if ((explicit || canPrefetchModel()) && !document.hidden && canRenderFullModel()) void pentimentoDesktopModelLoader.request(explicit ? 'high' : 'low').catch(() => { /* Selection retries background failures. */ })
}
type View = 'input' | 'model'

export default function Pentimento() {
  const id = useId()
  const host = useRef<HTMLDivElement>(null)
  const [modelVariant] = useState(pentimentoModelVariant)
  const interactiveDesktop = modelVariant === 'desktop'
  const videoReadiness = useRef<VideoReadiness>({ playing: false, stalled: true, bufferedAhead: 0, fullyBuffered: false })
  useEffect(() => {
    // Warm the genuine still with the interface, not after a model click.
    const image = new Image(); image.src = PENTIMENTO_MODEL_STILL
    if (!interactiveDesktop) return
    const release = pentimentoDesktopModelLoader.retain()
    void preloadModelViewer().catch(() => undefined)
    let visible = false, stableSince = 0, attempted = false
    const sync = () => {
      const video = videoReadiness.current
      if (!visible || document.hidden || !video.playing || video.stalled) { stableSince = 0; return }
      stableSince ||= performance.now()
      if (!attempted && canPrefetchModel() && performance.now() - stableSince >= 1500 && (video.bufferedAhead >= 5 || video.fullyBuffered)) { attempted = true; prefetchDesktop() }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .3
      sync()
    }, { threshold: [0, .3] })
    if (host.current) observer.observe(host.current)
    const dwell = setInterval(sync, 500)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); clearInterval(dwell); document.removeEventListener('visibilitychange', sync); release() }
  }, [interactiveDesktop])
  const [view, setView] = useState<View>('input')
  const [modelRequested, setModelRequested] = useState(false)
  const inputTab = useRef<HTMLButtonElement>(null)
  const modelTab = useRef<HTMLButtonElement>(null)
  const select = (next: View) => {
    setView(next)
    if (next === 'model') {
      setModelRequested(true)
      performance.mark('pentimento:model-selected')
      if (interactiveDesktop) prefetchDesktop(true)
    }
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'input' : event.key === 'End' ? 'model' : view === 'input' ? 'model' : 'input'
    select(next)
    ;(next === 'input' ? inputTab : modelTab).current?.focus()
  }

  return <div ref={host} className="object-viewer pentimento-experience" data-view={view}>
    <div className="pentimento-switch" role="tablist" aria-label="Pentimento input and reconstruction" onKeyDown={onKeyDown}>
      <span className="pentimento-switch-indicator" aria-hidden="true" />
      <button ref={inputTab} type="button" role="tab" id={`${id}-input-tab`} aria-selected={view === 'input'} aria-controls={`${id}-input-panel`} tabIndex={view === 'input' ? 0 : -1} onClick={() => select('input')}>INPUT VIDEO</button>
      <button ref={modelTab} onPointerEnter={() => { if (interactiveDesktop) prefetchDesktop(true) }} onFocus={() => { if (interactiveDesktop) prefetchDesktop(true) }} onPointerDown={() => { if (interactiveDesktop) prefetchDesktop(true) }} type="button" role="tab" id={`${id}-model-tab`} aria-selected={view === 'model'} aria-controls={`${id}-model-panel`} tabIndex={view === 'model' ? 0 : -1} onClick={() => select('model')}>FINAL MODEL</button>
    </div>
    <div className="pentimento-panels">
      <div id={`${id}-input-panel`} className="pentimento-panel" role="tabpanel" aria-labelledby={`${id}-input-tab`} aria-hidden={view !== 'input'} inert={view !== 'input'} data-active={view === 'input'}>
        <InputVideo active={view === 'input'} onReadiness={state => { videoReadiness.current = state }} />
      </div>
      <div id={`${id}-model-panel`} className="pentimento-panel" role="tabpanel" aria-labelledby={`${id}-model-tab`} aria-hidden={view !== 'model'} inert={view !== 'model'} data-active={view === 'model'}>
        {modelRequested && <RequestedModel active={view === 'model'} variant={modelVariant} />}
      </div>
    </div>
  </div>
}
