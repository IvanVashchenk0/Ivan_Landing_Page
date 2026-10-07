import { useId, type CSSProperties } from 'react'
import { useBanner } from './useBanner'
import { previewFrame } from './previewTimeline'
import { usePreviewPlayback } from './usePreviewPlayback'
import './preview.css'

const routes = [
  { id: 'DENY', title: 'DENY', caption: 'blocked / invalid' },
  { id: 'HUMAN_REVIEW', title: 'HUMAN REVIEW', caption: 'confirmation required' },
  { id: 'APPROVE', title: 'APPROVE', caption: 'authorized' },
] as const

export default function ArgusPreview() {
  const id = useId()
  const { stageRef, elapsed, playing, advancing, complete, reducedMotion, replay, skip, toggle } = usePreviewPlayback()
  const frame = previewFrame(elapsed)
  const banner = useBanner()
  const brand = frame.state === 'BRAND' || frame.state === 'COMPLETE'
  const fade = brand && banner.status === 'ready' ? reducedMotion || complete ? 1 : frame.brandProgress : 0
  const purchase = reducedMotion ? frame.intercepted ? 1 : 0 : frame.purchaseProgress
  const capture = reducedMotion ? frame.intercepted ? 1 : 0 : frame.captureProgress
  const signal = reducedMotion ? frame.approved ? 1 : 0 : frame.signalProgress
  // The card nearly reaches payment, then snaps back into Argus in 320ms.
  const requestStyle = {
    '--request-x': `${30 + purchase * 40 - capture * 20}%`,
    '--request-mobile-y': `${27 + purchase * 45 - capture * 22}%`,
    '--inspection-scale': reducedMotion ? 1 : 1.28 - capture * .28,
  } as CSSProperties
  return <div className="argus-preview" data-state={frame.state} data-running={advancing} data-reduced-motion={reducedMotion} data-selected={frame.approved ? 'APPROVE' : 'NONE'}>
    <div ref={stageRef} className="argus-preview-stage" role="group" aria-label="Argus purchase authorization preview" aria-describedby={`${id}-description`}>
      <div className="ap-system" aria-hidden={brand} style={{ opacity: 1 - fade, visibility: fade === 1 ? 'hidden' : 'visible' }}>
        <span className="ap-kicker">AGENT PAYMENTS / INDEPENDENT AUTHORIZATION</span>
        <div className="ap-diagram" data-tree={frame.treeVisible} data-intercepted={frame.intercepted}>
          <svg className="ap-connectors ap-desktop" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
            {!frame.treeVisible && <path className="ap-line ap-payment-line" d="M150 210H840" strokeDasharray={frame.intercepted ? '5 7' : undefined}/>}
            {frame.treeVisible && <>
              <path className="ap-line" d="M500 95V150M500 205V260M140 345V260H860V345M500 260V345"/>
              <path className="ap-active-signal" d="M500 205V260H860V345" pathLength="1" strokeDasharray={signal === 1 ? undefined : '1'} strokeDashoffset={1 - signal} opacity={signal > 0 ? 1 : 0}/>
              <path className="ap-branch-arrow" d="M132 337l8 8 8-8M492 337l8 8 8-8M852 337l8 8 8-8"/>
              <path className="ap-approval-arrow" d="m852 337 8 8 8-8" opacity={frame.approved ? 1 : 0}/>
            </>}
          </svg>
          <svg className="ap-connectors ap-mobile" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {!frame.treeVisible && <path className="ap-line ap-payment-line" d="M50 12V83" strokeDasharray={frame.intercepted ? '4 6' : undefined}/>}
            {frame.treeVisible && <>
              <path className="ap-line" d="M50 18V28M50 35H10V80H26M10 48H26M10 64H26"/>
              <path className="ap-active-signal" d="M50 35H10V80H26" pathLength="1" strokeDasharray={signal === 1 ? undefined : '1'} strokeDashoffset={1 - signal} opacity={signal > 0 ? 1 : 0}/>
            </>}
          </svg>
          <div className="ap-station ap-agent"><span className="ap-station-index">01</span><strong>AI AGENT</strong></div>
          <div className="ap-station ap-payment"><span className="ap-station-index">03</span><strong>PAYMENT</strong></div>
          <div className="ap-transaction" style={requestStyle} aria-hidden={frame.treeVisible}>
            {frame.intercepted && <div className="ap-inspection-ring" aria-hidden="true"><i/><i/><i/><i/></div>}
            <div className="ap-request">
              <svg className="ap-request-icon" viewBox="0 0 32 40" fill="none" aria-hidden="true"><path d="M5 2h16l7 7v29H5Z M20 2v9h8 M11 19h11 M11 25h11 M11 31h6"/></svg>
              <span>PURCHASE<br/>REQUEST</span>
            </div>
          </div>
          <div className="ap-gate" style={{ visibility: frame.intercepted ? 'visible' : 'hidden' }}>
            <span className="ap-gate-index">{frame.treeVisible ? 'AUTHORIZATION' : 'PURCHASE INTERCEPTED'}</span><strong>ARGUS</strong>
          </div>
          <p className="ap-intercept-caption" style={{ visibility: frame.intercepted && capture > .9 && !frame.treeVisible ? 'visible' : 'hidden' }}>PAYMENT AUTHORITY<br/>{' '}WITHHELD</p>
          <div className="ap-decision" style={{ visibility: frame.treeVisible ? 'visible' : 'hidden' }}>DECISION ENGINE</div>
          <ul className="ap-outcomes" aria-label="Possible authorization outcomes" style={{ visibility: frame.treeVisible ? 'visible' : 'hidden' }}>
            {routes.map(route => <li key={route.id} className={`ap-outcome ap-outcome-${route.id.toLowerCase()}`} data-route={route.id} data-active={route.id === 'APPROVE' && frame.approved}>
              <strong>{route.title}</strong><span>{route.caption}</span>
              {route.id === 'APPROVE' && <i className="ap-approval-tail" aria-hidden="true"/>}
            </li>)}
          </ul>
          <p className="ap-example-note" style={{ visibility: frame.treeVisible ? 'visible' : 'hidden' }}>Three outcomes. One illustrated route.</p>
        </div>
      </div>
      <img className="ap-banner" src={banner.src} width="8000" height="4500" alt="ARGUS — Guarding every payment" aria-hidden={!brand || banner.status !== 'ready'} style={{ opacity: fade, visibility: fade > 0 ? 'visible' : 'hidden' }}/>
    </div>
    <div className="ap-controls"><span>AUTHORIZATION / DEMONSTRATION</span><div>{complete ? <button type="button" onClick={replay}>Replay <span aria-hidden="true">↻</span></button> : <><button type="button" onClick={toggle}>{playing ? 'Pause' : 'Resume'}</button><button type="button" onClick={skip}>Skip animation <span aria-hidden="true">→</span></button></>}</div></div>
    {brand && banner.status !== 'ready' && <div className="ap-banner-status" role="status">{banner.status === 'error' ? <><span>The Argus banner could not load.</span><button type="button" onClick={banner.retry}>Retry banner</button></> : 'Loading the Argus banner…'}</div>}
    <p className="sr-only" id={`${id}-description`}>An AI agent attempts a purchase. Argus intercepts the request before payment and routes it through one decision engine: deny, human review, or approve. This example illustrates approval; all three outcomes are possible. The sequence ends on the original Argus banner. No live AI or payment calls occur. Replay controls and the Explore Project link follow the preview.</p>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{frame.announcement}</p>
  </div>
}
