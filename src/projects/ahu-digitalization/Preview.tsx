import { AhuVideo } from './AhuVideo'
import { AHU_PREVIEW_POSTER, AHU_PREVIEW_VIDEO } from './media'
import './styles.css'

export default function AhuPreview() {
  return <section className="ahu-preview" aria-label="AHU digitalization pipeline preview">
    <AhuVideo
      src={AHU_PREVIEW_VIDEO}
      poster={AHU_PREVIEW_POSTER}
      label="Complete AHU digitalization pipeline preview"
      autoplay
      loop
    />
  </section>
}
