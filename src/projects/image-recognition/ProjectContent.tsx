import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TechnicalVideo } from './TechnicalVideo'
import {
  IMAGE_RECOGNITION_BLUR_DIAGRAM,
  IMAGE_RECOGNITION_BLUR_STAGES,
  IMAGE_RECOGNITION_CONCURRENT_POSTER,
  IMAGE_RECOGNITION_CONCURRENT_VIDEO,
  IMAGE_RECOGNITION_SIMILARITY_POSTER,
  IMAGE_RECOGNITION_SIMILARITY_VIDEO,
} from './media'
import './styles.css'

function useMobileDiagram() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}

function BlurDiagram() {
  const mobile = useMobileDiagram()
  const dialogRef = useRef<HTMLDialogElement>(null)
  if (mobile) return <div className="blur-stage-rail" role="region" aria-label="Eight stages of blur analysis. Swipe horizontally to inspect each source crop." tabIndex={0}>
    {IMAGE_RECOGNITION_BLUR_STAGES.map((stage, index) => <figure key={stage.title}>
      <img src={stage.src} alt={`Stage ${index + 1}: ${stage.title}`} loading={index < 2 ? 'eager' : 'lazy'} />
      <figcaption className="mono">{String(index + 1).padStart(2, '0')} / 08</figcaption>
    </figure>)}
  </div>
  return <>
    <figure className="blur-diagram">
      <img src={IMAGE_RECOGNITION_BLUR_DIAGRAM} alt="Eight-stage blur analysis, from the original photograph through edge measurements and ranked comparison" />
      <figcaption><button className="text-link" type="button" onClick={() => dialogRef.current?.showModal()}>EXPAND DIAGRAM ↗</button></figcaption>
    </figure>
    <dialog ref={dialogRef} className="blur-diagram-dialog" aria-label="Expanded blur analysis diagram">
      <button className="mono" type="button" onClick={() => dialogRef.current?.close()}>CLOSE ×</button>
      <img src={IMAGE_RECOGNITION_BLUR_DIAGRAM} alt="Expanded eight-stage blur analysis diagram" />
    </dialog>
  </>
}

function Exhibit({ number, title, introduction, children }: { number: string; title: string; introduction: string; children: ReactNode }) {
  const id = `image-recognition-exhibit-${number}`
  return <section className="image-recognition-exhibit" aria-labelledby={id}>
    <header><span className="mono">{number} /</span><h2 id={id}>{title}</h2><p>{introduction}</p></header>
    {children}
  </section>
}

export default function ImageRecognitionProjectContent() {
  return <div className="image-recognition-case-study">
    <Exhibit number="01" title="BLUR DETECTION" introduction="Assess image sharpness across edge-rich regions, normalize the result, and prioritize clearer source images for downstream review.">
      <BlurDiagram />
    </Exhibit>
    <Exhibit number="02" title="IMAGE SIMILARITY" introduction="Histogram-correlation and pixel-similarity information support repeated pairwise comparison, helping identify redundant or visually related images.">
      <TechnicalVideo src={IMAGE_RECOGNITION_SIMILARITY_VIDEO} poster={IMAGE_RECOGNITION_SIMILARITY_POSTER} label="Image similarity analysis demonstration" autoplay loop />
    </Exhibit>
    <Exhibit number="03" title="CONCURRENT DATASET PROCESSING" introduction="One folder, one active assignment, with recorded progress and ownership. Shared availability checks, claims, locks, manifests, and assignment history coordinate work without conflicting edits.">
      <TechnicalVideo src={IMAGE_RECOGNITION_CONCURRENT_VIDEO} poster={IMAGE_RECOGNITION_CONCURRENT_POSTER} label="Concurrent image dataset assignment demonstration" autoplay loop />
    </Exhibit>
  </div>
}
