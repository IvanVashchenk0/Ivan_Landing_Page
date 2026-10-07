import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import Simulator from './Simulator'
import { projects } from '../../data/projects/index'
import './animation.css'

export default function MonteCarloProjectContent() {
  const simulator = useRef<HTMLElement>(null)
  const { hash } = useLocation()
  useEffect(() => {
    if (hash !== '#futures-simulator') return
    const frame = requestAnimationFrame(() => simulator.current?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [hash])
  return <>
    <section className="ff-simulator-section" id="futures-simulator" ref={simulator} aria-labelledby="futures-simulator-heading">
      <div className="ff-simulator-intro"><span className="mono">YOUR ASSUMPTIONS / FRESH SAMPLES</span><h2 id="futures-simulator-heading">Explore the model.</h2><p>The animation follows one reproducible run. Here, every run generates 10,000 new futures per vehicle.</p></div>
      <Simulator/>
    </section>
    <div className="project-details">{projects.find(project => project.id === 'monte-carlo')!.details.map((detail, index) => <div key={detail.label}><span className="mono">0{index + 1} / {detail.label}</span><p>{detail.text}</p></div>)}</div>
  </>
}
