import { THERMAL_HOME_PIPELINE_POSTER, THERMAL_HOME_PIPELINE_VIDEO } from './media'
import { ThermalPipelineVideo } from './ThermalPipelineVideo'
import './styles.css'

export default function ThermalHomeModelingPreview() {
  return <section className="thermal-home-preview" aria-label="Thermal Home Modeling pipeline preview">
    <ThermalPipelineVideo src={THERMAL_HOME_PIPELINE_VIDEO} poster={THERMAL_HOME_PIPELINE_POSTER} />
  </section>
}
