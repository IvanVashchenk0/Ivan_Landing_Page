import { AhuVideo } from './AhuVideo'
import {
  AHU_APPLICATION_POSTER,
  AHU_APPLICATION_VIDEO,
  AHU_COMPLETE_PIPELINE_POSTER,
  AHU_COMPLETE_PIPELINE_VIDEO,
  AHU_ENGINEERING_OUTPUT_POSTER,
  AHU_ENGINEERING_OUTPUT_VIDEO,
  AHU_MODEL_GENERATION_POSTER,
  AHU_MODEL_GENERATION_VIDEO,
  AHU_SCANNING_POSTER,
  AHU_SCANNING_VIDEO,
} from './media'
import './styles.css'

const exhibits = [
  ['01', 'SCANNING', AHU_SCANNING_VIDEO, AHU_SCANNING_POSTER],
  ['02', '3D MODEL GENERATION', AHU_MODEL_GENERATION_VIDEO, AHU_MODEL_GENERATION_POSTER],
  ['03', 'DIGITAL AHU APPLICATION', AHU_APPLICATION_VIDEO, AHU_APPLICATION_POSTER],
  ['04', 'ENGINEERING OUTPUT', AHU_ENGINEERING_OUTPUT_VIDEO, AHU_ENGINEERING_OUTPUT_POSTER],
  ['05', 'COMPLETE PIPELINE', AHU_COMPLETE_PIPELINE_VIDEO, AHU_COMPLETE_PIPELINE_POSTER],
] as const

export default function AhuProjectContent() {
  return <div className="ahu-case-study">
    {exhibits.map(([number, title, src, poster]) => <section className="ahu-exhibit" aria-labelledby={`ahu-exhibit-${number}`} key={number}>
      <header><span className="mono">{number} /</span><h2 id={`ahu-exhibit-${number}`}>{title}</h2></header>
      <AhuVideo src={src} poster={poster} label={`${title.toLowerCase()} demonstration`} autoplay loop controls />
    </section>)}
  </div>
}
