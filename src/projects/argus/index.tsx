import { useId } from 'react'
import { SceneView } from './Scenes'
import { authorizationInput, routeAuthorization } from './scenario'
import { authorizationResolved, clamp01, frameAt, timeline } from './timeline'
import { useAnimationPlayback } from './useAnimationPlayback'
import { useBanner } from './useBanner'
import './styles.css'

export default function Argus() {
  const id = useId()
  const { stageRef, elapsed, reducedMotion, complete, playing, advancing, replay, skip, toggle } = useAnimationPlayback()
  const banner = useBanner()
  const frame = frameAt(elapsed)
  const showingBanner = frame.scene.id === 'BANNER'
  const bannerOpacity = showingBanner && banner.status === 'ready' ? complete || reducedMotion ? 1 : clamp01(frame.localTime / frame.scene.duration) : 0
  const sceneOpacity = (index: number) => {
    if (showingBanner) return index === timeline.length - 2 ? 1 - bannerOpacity : 0
    if (index === frame.index) return reducedMotion || frame.index === 0 ? 1 : clamp01(frame.localTime / 200)
    if (index === frame.index - 1 && !reducedMotion) return 1 - clamp01(frame.localTime / 200)
    return 0
  }
  return <div className="argus-animation" data-scene={frame.scene.id} data-phase={complete ? 'complete' : playing ? 'playing' : 'paused'} data-running={advancing} data-reduced-motion={reducedMotion} data-authorization={authorizationResolved(elapsed) ? routeAuthorization(authorizationInput) : 'UNRESOLVED'}>
    <div ref={stageRef} className="argus-animation-stage" aria-label="Argus architecture animation" role="group" aria-describedby={`${id}-description`}>
      <div className="argus-story" aria-hidden={showingBanner}>
        <div className="argus-story-topline argus-mono"><span>ARGUS / SYSTEM ARCHITECTURE</span><span>{String(Math.min(frame.index + 1, 14)).padStart(2, '0')} / 14</span></div>
        <div className="argus-scenes">{timeline.slice(0, -1).map((scene, index) => {
          const active = index === frame.index
          const opacity = sceneOpacity(index)
          return <section key={scene.id} className={`argus-scene scene-${scene.id.toLowerCase()}`} data-scene-id={scene.id} data-active={active} aria-hidden={!active || showingBanner} style={{ opacity, visibility: opacity > 0 ? 'visible' : 'hidden' }}>
            <SceneView scene={scene} time={active ? frame.localTime : index < frame.index ? scene.duration : 0} reduced={reducedMotion} />
          </section>
        })}</div>
        <div className="argus-story-bottomline argus-mono"><span>{frame.index < 9 ? 'ACTIVE LOGIC ≠ AUTHORIZATION' : 'INTERPRETATION → LOGIC → ENFORCEMENT'}</span><span>USER → AGENT → ARGUS → PAYMENT</span></div>
      </div>
      <img className="argus-final-banner" src={banner.src} alt="ARGUS — Guarding every payment" width="8000" height="4500" aria-hidden={!showingBanner || banner.status !== 'ready'} style={{ opacity: bannerOpacity, visibility: bannerOpacity > 0 ? 'visible' : 'hidden' }} />
    </div>
    <div className="argus-animation-controls">
      <span className="argus-mono">SYSTEM TRACE / DEMONSTRATION</span>
      <div>{complete ? <button type="button" onClick={replay}>Replay <span aria-hidden="true">↻</span></button> : <><button type="button" onClick={toggle}>{playing ? 'Pause' : 'Resume'}</button><button type="button" onClick={skip}>Skip animation <span aria-hidden="true">→</span></button></>}</div>
    </div>
    {showingBanner && banner.status !== 'ready' && <div className="argus-banner-status" role="status">{banner.status === 'error' ? <><span>The Argus banner could not load.</span><button type="button" onClick={banner.retry}>Retry banner</button></> : 'Loading the Argus banner…'}</div>}
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{frame.scene.announcement}</p>
    <p className="sr-only" id={`${id}-description`}>A controlled architectural example, with no live model calls, payment, or audit submission. The human defines intent; a shopping agent proposes a purchase; Argus intercepts it. Clean conversation produces structured intent, separate from browsing context. Policy and verification outputs feed deterministic deny, review, or authorize routing. Authorization creates a scoped credential before enabling payment and recording an audit. Pause, skip, and replay controls follow the animation.</p>
  </div>
}
