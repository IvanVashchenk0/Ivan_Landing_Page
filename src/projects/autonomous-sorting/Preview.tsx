import { sortingImages } from './media'
import './styles.css'

export default function AutonomousSortingPreview() {
  const drawing = sortingImages.assemblyDrawing
  return <section className="sorting-preview" aria-label="SolidWorks assembly drawing preview">
    <figure className="sorting-preview-frame">
      <img src={drawing.src} alt={drawing.alt} width={drawing.width} height={drawing.height} loading="eager" fetchPriority="high" />
      <figcaption className="mono">SOLIDWORKS ASSEMBLY DRAWING</figcaption>
    </figure>
    <p className="sorting-preview-note mono">DESIGNED / FABRICATED / TESTED</p>
  </section>
}
