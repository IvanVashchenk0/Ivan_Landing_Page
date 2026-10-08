import { TechnicalVideo } from './TechnicalVideo'
import { IMAGE_RECOGNITION_PIPELINE_POSTER, IMAGE_RECOGNITION_PIPELINE_VIDEO } from './media'
import './styles.css'

export default function ImageRecognitionPreview() {
  return <section className="image-recognition-preview" aria-label="Complete image recognition pipeline demonstration">
    <div className="image-recognition-preview-label mono">COMPLETE ANALYSIS PIPELINE / DEMONSTRATION</div>
    <TechnicalVideo
      src={IMAGE_RECOGNITION_PIPELINE_VIDEO}
      poster={IMAGE_RECOGNITION_PIPELINE_POSTER}
      label="Complete construction image recognition pipeline, from source collection through structured output"
      autoplay
      loop
    />
  </section>
}
