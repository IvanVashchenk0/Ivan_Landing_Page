import { useState } from 'react'
import { PENTIMENTO_PROJECT_PITCH_THUMBNAIL, PENTIMENTO_PROJECT_WEBSITE } from './media'
import './project-content.css'

const PROJECT_WEBSITE = 'https://pentimentolandingpage.vercel.app/'
const PROJECT_PITCH = 'https://youtu.be/FA3qZ2IVGwc'
const PROJECT_PITCH_EMBED = 'https://www.youtube-nocookie.com/embed/FA3qZ2IVGwc?autoplay=1&playsinline=1&rel=0'

function ProjectPitch() {
  const [playing, setPlaying] = useState(false)
  return <div className="pentimento-pitch-stage" data-playing={playing}>
    {playing ? <iframe src={PROJECT_PITCH_EMBED} title="Pentimento project pitch" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> : <button type="button" className="pentimento-pitch-play" onClick={() => setPlaying(true)} aria-label="Play Pentimento project pitch">
      <img src={PENTIMENTO_PROJECT_PITCH_THUMBNAIL} width="1280" height="720" alt="Pentimento project pitch thumbnail" loading="lazy" />
      <span aria-hidden="true">▶</span>
    </button>}
  </div>
}

export default function PentimentoProjectContent() {
  return <div className="pentimento-project-materials">
    <section className="pentimento-project-material" aria-labelledby="pentimento-website-title">
      <header><span className="mono">01 / PROJECT WEBSITE</span><h2 id="pentimento-website-title">PENTIMENTO — PROJECT WEBSITE</h2></header>
      <a className="pentimento-website-preview" href={PROJECT_WEBSITE} target="_blank" rel="noopener noreferrer" aria-label="Visit Pentimento project website">
        <img src={PENTIMENTO_PROJECT_WEBSITE} width="1440" height="900" alt="Pentimento project website landing page" loading="lazy" />
        <span className="mono">VISIT WEBSITE ↗</span>
      </a>
    </section>
    <section className="pentimento-project-material" aria-labelledby="pentimento-pitch-title">
      <header><span className="mono">02 / PROJECT PITCH</span><h2 id="pentimento-pitch-title">PENTIMENTO — PROJECT PITCH</h2></header>
      <ProjectPitch />
      <a className="pentimento-pitch-link mono" href={PROJECT_PITCH} target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE ↗</a>
    </section>
  </div>
}
