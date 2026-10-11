import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { sortingImages, type SortingImage } from './media'
import './styles.css'

function ImageFigure({ asset, className = '', eager = false }: { asset: SortingImage; className?: string; eager?: boolean }) {
  const { open } = useSortingLightbox()
  return <figure className={`sorting-figure ${className}`.trim()}>
    <button type="button" className="sorting-image-button" onClick={event => open(asset, event.currentTarget)} aria-label={`Expand ${asset.label.toLowerCase()}`}>
      <img src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} loading={eager ? 'eager' : 'lazy'} />
    </button>
    <figcaption className="mono">{asset.label}</figcaption>
  </figure>
}

type LightboxContextValue = { open: (asset: SortingImage, opener: HTMLButtonElement) => void }
const SortingLightboxContext = createContext<LightboxContextValue | null>(null)
function useSortingLightbox() {
  const context = useContext(SortingLightboxContext)
  if (!context) throw new Error('Sorting lightbox is unavailable.')
  return context
}

function LightboxProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [selected, setSelected] = useState<SortingImage | null>(null)
  const open = (asset: SortingImage, openingButton: HTMLButtonElement) => {
    opener.current = openingButton
    setSelected(asset)
  }
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [selected])
  const finishClose = () => {
    setSelected(null)
    opener.current?.focus()
  }
  return <SortingLightboxContext.Provider value={{ open }}>
    {children}
    <dialog ref={dialog} className="sorting-lightbox" aria-label={selected ? `Expanded ${selected.label.toLowerCase()}` : 'Expanded project image'} onClose={finishClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <button className="sorting-lightbox-close mono" type="button" onClick={() => dialog.current?.close()}>CLOSE ×</button>
      {selected && <figure><img src={selected.src} alt={selected.alt} width={selected.width} height={selected.height} style={selected.id === '10-cad-top' ? { maxWidth: `${selected.width}px` } : undefined} /><figcaption className="mono">{selected.label}</figcaption></figure>}
    </dialog>
  </SortingLightboxContext.Provider>
}

function Exhibit({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  const id = `sorting-exhibit-${number}`
  return <section className="sorting-exhibit" aria-labelledby={id}>
    <header><span className="mono">{number} /</span><h2 id={id}>{title}</h2></header>
    {children}
  </section>
}

export default function AutonomousSortingProjectContent() {
  return <LightboxProvider><div className="sorting-case-study">
    <Exhibit number="01" title="SYSTEM DESIGN">
      <div className="sorting-specification mono"><span>3 MATERIALS</span><span>2 BEARING SIZES</span><span>6 TARGET CATEGORIES</span></div>
      <div className="sorting-design-sequence">
        <ImageFigure asset={sortingImages.conceptSketch} className="sorting-concept" eager />
        <ImageFigure asset={sortingImages.cadIsometric} className="sorting-primary-cad" />
        <div className="sorting-cad-grid">
          <ImageFigure asset={sortingImages.cadFront} />
          <ImageFigure asset={sortingImages.cadSide} />
          <ImageFigure asset={sortingImages.cadTop} className="sorting-cad-top" />
        </div>
        <ImageFigure asset={sortingImages.assemblyDrawing} className="sorting-assembly-drawing" />
      </div>
    </Exhibit>

    <Exhibit number="02" title="MACHINE VISION">
      <div className="sorting-vision-grid"><ImageFigure asset={sortingImages.visionResult} /><ImageFigure asset={sortingImages.visionResultAlt} /></div>
      <p className="sorting-technical-note">Early models trained on images from a different camera struggled in the deployed environment. Retraining with images captured by the Raspberry Pi camera improved material classification.</p>
      <p className="sorting-metadata mono">RASPBERRY PI / CAMERA-BASED CLASSIFICATION / GOOGLE TEACHABLE MACHINE</p>
    </Exhibit>

    <Exhibit number="03" title="TESTING & RESULTS">
      <div className="sorting-results">
        <section aria-labelledby="sorting-validated"><h3 className="mono" id="sorting-validated">VALIDATED</h3><ul>
          <li>Bearing size separation</li><li>Delivery to identification zone</li><li>Individual bearing positioning</li><li>Camera-based material classification</li>
        </ul></section>
        <section aria-labelledby="sorting-challenges"><h3 className="mono" id="sorting-challenges">REMAINING CHALLENGES</h3><ul>
          <li>Turning-slide alignment and occasional bearing drops</li><li>Incomplete packaging-station integration</li><li>Full-system operational reliability</li>
        </ul></section>
      </div>
      <p className="sorting-credit mono">TEAM PROJECT / BRAD MULWENGE · KESIENA BEREZI · IVAN VASHCHENKO / 2025</p>
    </Exhibit>
  </div></LightboxProvider>
}
