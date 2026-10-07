import { useId } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimationScene } from './AnimationScenes'
import { getDemonstration } from './scenario'
import { clamp01, frameAt, timeline } from './timeline'
import { useAnimationPlayback } from './useAnimationPlayback'
import './animation.css'

export default function MonteCarlo() {
  const id = useId()
  const location = useLocation()
  const data = getDemonstration()
  const { stageRef, elapsed, reducedMotion, complete, playing, advancing, replay, skip, toggle } = useAnimationPlayback()
  const { scene, index, localTime } = frameAt(elapsed)
  const projectPage = location.pathname.replace(/\/$/, '') === '/projects/monte-carlo'
  return <div className="future-film" data-scene={scene.id} data-running={advancing} data-complete={complete} data-reduced-motion={reducedMotion}>
    <div className="future-film-stage" ref={stageRef} role="group" aria-label="10,000 Futures model animation" aria-describedby={`${id}-description`}>
      <div className="ff-topline"><span>ENGINEERING ECONOMY / 8 YEARS</span><span>{String(index + 1).padStart(2, '0')} / 14</span></div>
      <div className="ff-scenes">{timeline.map((item, i) => {
        const active = i === index
        const fade = reducedMotion || index === 0 ? 1 : clamp01(localTime / 200)
        const opacity = active ? fade : i === index - 1 && !reducedMotion ? 1 - fade : 0
        return <section className={`ff-scene ff-scene-${item.id.toLowerCase()}`} key={item.id} aria-hidden={!active} data-active={active} data-scene-id={item.id} style={{ opacity, visibility: opacity > 0 ? 'visible' : 'hidden' }}>
          {item.id !== 'SETUP' && <header><span className="ff-kicker">{item.id === 'FRAMEWORK' ? 'THE DECISION FRAMEWORK' : 'FROM UNCERTAINTY TO UNDERSTANDING'}</span><h3>{item.title}</h3></header>}
          <AnimationScene id={item.id} progress={active ? clamp01(localTime / item.duration) : i < index ? 1 : 0} reduced={reducedMotion} data={data}/>
        </section>
      })}</div>
      <div className="ff-bottomline"><span>MODEL ASSUMPTIONS, NOT MARKET OBSERVATIONS</span><span>10,000 FUTURES / VEHICLE</span></div>
    </div>
    <div className="ff-controls"><span>STOCHASTIC MODEL / DEMONSTRATION</span><div>{complete ? <button type="button" onClick={replay}>Replay ↻</button> : <><button type="button" onClick={toggle}>{playing ? 'Pause' : 'Resume'}</button><button type="button" onClick={skip}>Skip animation →</button></>}</div></div>
    <div className="ff-explore"><Link to="/projects/monte-carlo#futures-simulator" onClick={projectPage ? () => document.getElementById('futures-simulator')?.scrollIntoView({ block: 'start' }) : undefined}>Explore the interactive model {projectPage ? '↓' : '→'}</Link><span>Change assumptions. Generate fresh futures.</span></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{scene.announcement}</p>
    <p className="sr-only" id={`${id}-description`}>This reproducible demonstration samples uncertain vehicle costs, builds eight years of cash flows, discounts them into one NPV, and repeats for ten thousand futures per vehicle. Histograms show the range of outcomes. VaR identifies the lower fifth-percentile cutoff; CVaR averages outcomes at or below it. Cumulative distributions compare entire samples. Sensitivity changes individual inputs by ten percent. The gold path is one example, not a prediction. Pause, skip, replay, and a link to the interactive simulator follow the animation.</p>
  </div>
}
