import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { articles, stripRecords, ivanMedia, type IvanRecord, recordFocusUrl } from '../../data/editorial/index'
import { ClipPreview } from '../media/ClipPreview'
import './styles.css'

export function MaterialStrip({ records = articles }: { records?: IvanRecord[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const group = useRef<HTMLUListElement>(null)
  const videoPosition = useRef<Record<string, number>>({})
  const getPosition = useCallback((id: string) => videoPosition.current[id] ?? 0, [])
  const onPosition = useCallback((id: string, value: number) => { videoPosition.current[id] = value }, [])
  const [paused, setPaused] = useState(false)
  const [copies, setCopies] = useState(3)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const interaction = useRef({ hover: false, focus: false, down: false, touch: false, holdUntil: 0 })
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const element = viewport.current
    const first = group.current
    if (!element || !first) return
    let width = 0, offset = 0, frame = 0, previous = performance.now(), visible = false
    const measure = () => {
      const phase = width ? (element.scrollLeft % width) / width : 0
      width = first.getBoundingClientRect().width
      offset = reduced ? 0 : width + phase * width
      element.scrollLeft = offset
    }
    const resize = new ResizeObserver(() => {
      measure()
      if (width) setCopies(Math.max(3, Math.ceil(element.clientWidth / width) + 2))
    })
    resize.observe(first)
    resize.observe(element)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .2
      if (!visible) element.dataset.running = 'false'
    }, { threshold: [0, .2] })
    observer.observe(element)
    measure()
    const tick = (now: number) => {
      const state = interaction.current
      const running = !reduced && !paused && visible && !document.hidden && !state.hover && !state.focus && !state.down && now >= state.holdUntil
      element.dataset.running = String(running)
      if (running && width) {
        state.touch = false
        offset += Math.min(now - previous, 100) * .022
        // Matching copies occupy these boundaries; preserve the fractional pixel accumulator.
        if (offset >= width * 2) offset -= width
        if (offset < width) offset += width
        element.scrollLeft = offset
      } else offset = element.scrollLeft
      previous = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect() }
  }, [paused, reduced])

  const release = () => {
    interaction.current.down = false
    interaction.current.holdUntil = performance.now() + 1200
    if (drag.current?.moved) suppressClick.current = true
    drag.current = null
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false
    interaction.current.down = true
    interaction.current.touch = event.pointerType !== 'mouse'
    if (event.pointerType === 'mouse' && event.button === 0) drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false }
  }
  return <div className="material-strip" data-paused={paused} data-reduced-motion={reduced}>
    <div ref={viewport} className="material-viewport" role="region" aria-label="Ivan Vashchenko stories and publications"
      onMouseEnter={() => { interaction.current.hover = true }} onMouseLeave={() => { interaction.current.hover = false; if (drag.current && !drag.current.moved) release() }}
      onFocusCapture={() => { interaction.current.focus = true }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) interaction.current.focus = false }}
      onPointerDown={pointerDown} onPointerUp={release} onPointerCancel={release}
      onPointerMove={event => {
        const current = drag.current
        if (!current) return
        const delta = event.clientX - current.x
        if (Math.abs(delta) > 6) { current.moved = true; event.currentTarget.setPointerCapture(event.pointerId) }
        if (current.moved) { event.preventDefault(); event.currentTarget.scrollLeft = current.left - delta }
      }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false } }}
      onScroll={() => { if (interaction.current.touch) interaction.current.holdUntil = performance.now() + 1200 }}
      onWheel={event => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) interaction.current.holdUntil = performance.now() + 1200 }}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[data-canonical=true] a'))
        const current = links.indexOf(document.activeElement as HTMLAnchorElement)
        if (current < 0) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : Math.max(0, Math.min(links.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)))
        links[next].focus()
        links[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
      }}>
      <div className="material-track">
        {(reduced ? [1] : Array.from({ length: copies }, (_, index) => index)).map(copy => <ul ref={copy === (reduced ? 1 : 0) ? group : undefined} className="material-group" key={copy} aria-hidden={copy !== 1 ? true : undefined} data-canonical={copy === 1}>
          {stripRecords(records).map(record => <li key={record.id} className={`material-item material-item-${record.kind}`} data-record={record.id}>
            <Link to={recordFocusUrl(record.id)} aria-label={record.accessibleName} tabIndex={copy === 1 ? 0 : -1} draggable={false}>
              {record.kind === 'profile' ? <p>{record.paragraphs[0]}</p> : record.kind === 'video'
                ? <ClipPreview record={record} paused={paused} reduced={reduced} getPosition={getPosition} onPosition={onPosition} />
                : <img src={ivanMedia(record.image)} alt="" loading="lazy" draggable={false} width={record.imageWidth} height={record.imageHeight} style={{ objectPosition: record.imagePosition }} />}
              {record.kind === 'article' && <span className="material-headline">{record.title}</span>}
              {record.kind === 'profile' && <span className="material-profile-arrow" aria-hidden="true">↗</span>}
            </Link>
          </li>)}
        </ul>)}
      </div>
    </div>
    {!reduced && <div className="material-motion-control"><button type="button" aria-label={paused ? 'Resume moving material' : 'Pause moving material'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'RESUME' : 'PAUSE'} <span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span></button></div>}
  </div>
}
