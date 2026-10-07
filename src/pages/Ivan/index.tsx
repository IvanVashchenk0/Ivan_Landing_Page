import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { articles, orderedRecords, editorialLayout, ivanMedia, type IvanRecord } from '../../data/editorial/index'
import { LocalVideo } from '../../components/media/LocalVideo'
import '../../components/editorial/styles.css'

export function Ivan({ records = articles }: { records?: IvanRecord[] }) {
  const [params] = useSearchParams()
  const selected = params.get('item')
  useEffect(() => {
    if (!selected) return
    const frame = requestAnimationFrame(() => {
      const record = document.getElementById(`record-${selected}`)
      record?.focus({ preventScroll: true })
      record?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [selected])
  return <div className="ivan-page">
    <h1 className="ivan-name">IVAN<br/>VASHCHENKO<span className="name-dot">.</span></h1>
    <div className="ivan-composition">
      {orderedRecords(records).map((record, index) => <section key={record.id} id={`record-${record.id}`} className={`ivan-record ivan-record-${editorialLayout(record, index)}`} tabIndex={-1} aria-label={record.title}>
        {record.kind === 'article' && <>
          <a href={record.href} target="_blank" rel="noreferrer" aria-label={record.accessibleName}>
            <img src={ivanMedia(record.image)} alt={record.imageAlt} loading="lazy" width={record.imageWidth} height={record.imageHeight}/>
            <h2>{record.title}</h2>
          </a>
          <a className="source-link" href={record.href} target="_blank" rel="noreferrer">OPEN ARTICLE ↗</a>
        </>}
        {record.kind === 'document' && <Link to={`/ivan/${record.id}`} aria-label={record.accessibleName} className={record.companionImage ? 'ivan-spread' : undefined}>
          <img src={ivanMedia(record.image)} alt={record.imageAlt} loading="lazy" width="600" height="776"/>
          {record.companionImage && <img src={ivanMedia(record.companionImage)} alt={record.companionAlt ?? record.imageAlt} loading="lazy" width="800" height="1035"/>}
        </Link>}
        {record.kind === 'photograph' && <figure><img src={ivanMedia(record.image)} alt={record.imageAlt} loading="lazy" width={record.imageWidth} height={record.imageHeight}/>{record.href && <a className="source-link" href={record.href}>OPEN ORIGINAL ↗</a>}</figure>}
        {record.kind === 'video' && <LocalVideo record={record} />}
        {record.kind === 'profile' && <Link className="ivan-profile-excerpt" to={`/ivan/${record.id}`} aria-label={record.accessibleName}>
          <p>{record.paragraphs[0]}</p><p>{record.paragraphs[1]}</p><span aria-hidden="true">↗</span>
        </Link>}
      </section>)}
    </div>
  </div>
}
