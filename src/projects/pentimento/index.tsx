import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { InputVideo } from './InputVideo'

import { canPrefetchModel, pentimentoModelLoader } from './modelLoader'
import { preloadModelViewer } from './viewerCode'
import { ModelLoading } from './ModelLoading'

function RequestedModel({ active }: { active: boolean }) {
  const [Viewer, setViewer] = useState<ComponentType<{ active: boolean }> | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let mounted = true
    preloadModelViewer().then(module => { if (mounted) setViewer(() => module.default) }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false }
  }, [attempt])
  if (failed) return <div className="media-message mono" role="status">RECONSTRUCTION COULD NOT BE LOADED.<button className="model-retry" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Retry</button></div>
  return Viewer ? <Viewer active={active} /> : <ModelLoading />
}

function prefetch() {
  if (canPrefetchModel() && !document.hidden) void pentimentoModelLoader.request().catch(() => { /* Background failures remain silent; selection retries. */ })
}
type View = 'input' | 'model'

export default function Pentimento() {
  const id = useId()
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const release = pentimentoModelLoader.retain()
    void preloadModelViewer().catch(() => undefined)
    let visible = false
    let dwell: ReturnType<typeof setTimeout> | undefined
    const sync = () => {
      clearTimeout(dwell)
      if (visible && !document.hidden) { prefetch(); dwell = setTimeout(prefetch, 2500) }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .3
      sync()
    }, { threshold: [0, .3] })
    if (host.current) observer.observe(host.current)
    document.addEventListener('visibilitychange', sync)
    return () => { observer.disconnect(); clearTimeout(dwell); document.removeEventListener('visibilitychange', sync); release() }
  }, [])
  const [view, setView] = useState<View>('input')
  const [modelRequested, setModelRequested] = useState(false)
  const inputTab = useRef<HTMLButtonElement>(null)
  const modelTab = useRef<HTMLButtonElement>(null)
  const select = (next: View) => {
    setView(next)
    if (next === 'model') { setModelRequested(true); void pentimentoModelLoader.request().catch(() => undefined) }
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
      <button ref={modelTab} onPointerEnter={prefetch} onFocus={prefetch} onPointerDown={prefetch} type="button" role="tab" id={`${id}-model-tab`} aria-selected={view === 'model'} aria-controls={`${id}-model-panel`} tabIndex={view === 'model' ? 0 : -1} onClick={() => select('model')}>FINAL MODEL</button>
    </div>
    <div className="pentimento-panels">
      <div id={`${id}-input-panel`} className="pentimento-panel" role="tabpanel" aria-labelledby={`${id}-input-tab`} aria-hidden={view !== 'input'} inert={view !== 'input'} data-active={view === 'input'}>
        <InputVideo active={view === 'input'} />
      </div>
      <div id={`${id}-model-panel`} className="pentimento-panel" role="tabpanel" aria-labelledby={`${id}-model-tab`} aria-hidden={view !== 'model'} inert={view !== 'model'} data-active={view === 'model'}>
        {modelRequested && <RequestedModel active={view === 'model'} />}
      </div>
    </div>
  </div>
}
