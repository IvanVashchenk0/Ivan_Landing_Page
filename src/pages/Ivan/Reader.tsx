import { mediaUrl } from '../../data/media/config'
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { articles, ivanMedia, recordFocusUrl, type DocumentRecord } from '../../data/editorial/index'
import { NotFound } from '../NotFound'
import '../../components/editorial/styles.css'

function DocumentReader({ record }: { record: DocumentRecord }) {
  const [params, setParams] = useSearchParams()
  const requested = Number(params.get('page') ?? record.initialPage)
  const page = Number.isFinite(requested) ? Math.max(1, Math.min(record.pageCount, Math.trunc(requested))) : record.initialPage
  const [zoom, setZoom] = useState(1)
  const [texts, setTexts] = useState<string[]>([])
  const [textFailed, setTextFailed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch(ivanMedia(`${record.id}/text.json`), { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Unavailable')
      return response.json() as Promise<string[]>
    }).then(setTexts).catch(error => { if (error.name !== 'AbortError') setTextFailed(true) })
    return () => controller.abort()
  }, [record.id])
  const move = (next: number) => { setFailed(false); setAttempt(0); setParams({ page: String(next) }); setZoom(1) }
  const image = `${ivanMedia(`${record.id}/page-${page}.webp`)}${attempt ? `?retry=${attempt}` : ''}`
  return <>
    <h1>{record.title}</h1>
    <div className="ivan-document-toolbar">
      <div role="group" aria-label="Document pages">
        <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => move(page - 1)}>←</button>
        <output aria-live="polite" aria-label="Current page">{page} / {record.pageCount}</output>
        <button type="button" aria-label="Next page" disabled={page === record.pageCount} onClick={() => move(page + 1)}>→</button>
      </div>
      <div role="group" aria-label="Document zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom === 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <button type="button" onClick={() => setZoom(1)}>FIT WIDTH</button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 2.5} onClick={() => setZoom(value => value + .5)}>+</button>
      </div>
      <a className="source-link" href={mediaUrl(record.pdf)} target="_blank" rel="noreferrer">OPEN PDF ↗</a>
    </div>
    {failed && <p className="ivan-document-status" role="status">This page could not load. <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Retry page</button></p>}
    <div className="ivan-document-viewport" data-zoom={zoom} tabIndex={0} role="region" aria-label="Document page; scroll to inspect when zoomed">
      <img key={`${page}-${attempt}`} className="ivan-document-page" src={image} alt={`${record.title}, PDF page ${page} of ${record.pageCount}`} width="1600" height="2071" style={{ '--page-width': `${zoom * 100}%` } as CSSProperties} onError={() => setFailed(true)} />
    </div>
    <div className="sr-only" aria-label={`Text of PDF page ${page}`} lang="en">{texts[page - 1]}</div>
    {textFailed && <p className="ivan-document-status">Page text is unavailable. <a href={mediaUrl(record.pdf)} target="_blank" rel="noreferrer">Open the original PDF ↗</a></p>}
  </>
}

export default function IvanReader() {
  const { recordId } = useParams()
  const record = articles.find(item => item.id === recordId)
  if (!record || (record.kind !== 'document' && record.kind !== 'profile')) return <NotFound />
  return <div className="ivan-reader">
    <div className={record.kind === 'profile' ? 'ivan-profile-reader' : undefined}>
      <Link className="back-link mono" to={recordFocusUrl(record.id)}>← IVAN VASHCHENKO</Link>
      {record.kind === 'document' ? <DocumentReader key={record.id} record={record} /> : <article>
        <h1>{record.title}</h1>
        <div className="ivan-profile-body">{record.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>}
    </div>
  </div>
}
