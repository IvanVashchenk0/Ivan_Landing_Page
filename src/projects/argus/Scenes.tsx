import { memo, type CSSProperties, type ReactNode } from 'react'
import { authorizationInput, money, policyResult, routeAuthorization, scenario, verificationResult } from './scenario'
import { clamp01, DECISION_RESOLVED_AT, DECISION_SIGNAL_START, fieldVisible, type SceneDefinition } from './timeline'

type Field = [string, string | boolean]
const bool = (value: string | boolean) => typeof value === 'boolean' ? String(value).toUpperCase() : value
const purchase = scenario.purchase
const amount = money(purchase.amount)

function Fields({ items, time, duration, code = false }: { items: Field[]; time: number; duration: number; code?: boolean }) {
  return <dl className={`argus-fields${code ? ' argus-code-fields' : ''}`}>{items.map(([label, value], index) => {
    const visible = fieldVisible(time, index, items.length, duration)
    return <div key={label} data-revealed={visible} style={{ opacity: visible ? 1 : 0 }} aria-hidden={!visible}><dt>{label}</dt><dd>{bool(value)}</dd></div>
  })}</dl>
}
function Heading({ eyebrow, title }: { eyebrow: string; title: ReactNode }) {
  return <header className="argus-scene-heading"><span className="argus-mono">{eyebrow}</span><h3>{title}</h3></header>
}
function CaptionSwap({ changed, before, after }: { changed: boolean; before: string; after: string }) {
  return <div className="argus-caption-swap"><p className="argus-scene-caption" aria-hidden={changed} style={{ visibility: changed ? 'hidden' : 'visible' }}>{before}</p><p className="argus-scene-caption" aria-hidden={!changed} style={{ visibility: changed ? 'visible' : 'hidden' }}>{after}</p></div>
}
function Ring({ progress = 1 }: { progress?: number }) {
  return <svg className="argus-inspection-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53" className="ring-track" /><circle cx="60" cy="60" r="53" className="ring-flow" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} /><circle cx="60" cy="60" r="41" className="ring-inner" /><path d="M93 98 111 116" className="ring-handle" /></svg>
}
function Purchase({ status }: { status?: string }) {
  return <div className="argus-purchase-object"><span className="argus-mono">PROPOSED PURCHASE</span><strong>{purchase.product}</strong><span>{purchase.merchant}</span><b>{amount}</b>{status && <small className="argus-mono">{status}</small>}</div>
}
function SystemMap({ active = '', enabled = false }: { active?: string; enabled?: boolean }) {
  return <div className="argus-system-map" data-enabled={enabled}>
    {['USER', 'SHOPPING AGENT', 'ARGUS', 'PAYMENT'].map(label => <div key={label} data-node={label} data-active={active === label} className={label === 'ARGUS' ? 'argus-map-gate' : ''}><span className="argus-map-mark" aria-hidden="true">{label === 'ARGUS' ? '◎' : label === 'PAYMENT' ? '⊡' : label === 'USER' ? '○' : '◇'}</span><span className="argus-mono">{label}</span></div>)}
  </div>
}
function DecisionTree({ time, reduced }: { time: number; reduced: boolean }) {
  const route = routeAuthorization(authorizationInput)
  const resolved = time >= DECISION_RESOLVED_AT
  const progress = reduced ? (resolved ? 1 : 0) : clamp01((time - DECISION_SIGNAL_START) / (DECISION_RESOLVED_AT - DECISION_SIGNAL_START))
  return <>
    <Heading eyebrow="APPLICATION LOGIC / ONE INPUT, ONE ROUTE" title="Three routes. One decision." />
    <div className="argus-decision-tree" data-resolved={resolved}>
      <div className="argus-tree-root argus-mono" data-received={time >= 700}>DECISION ENGINE<span>{time < 700 ? 'AWAITING STRUCTURED INPUT' : resolved ? 'ROUTE SELECTED' : 'EVALUATING CONDITIONS'}</span></div>
      <svg className="argus-tree-lines argus-tree-desktop" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M500 0V38H166.67V100 M500 38V100 M500 38H833.33V100" className="argus-wire" />
        <path d="M500 0V38H833.33V100" className="argus-signal" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      </svg>
      <svg className="argus-tree-lines argus-tree-mobile" viewBox="0 0 44 420" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0V350 M0 70H44 M0 210H44 M0 350H44" className="argus-wire" />
        <path d="M0 0V350H44" className="argus-signal" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      </svg>
      <div className="argus-tree-branches">
        <div className="argus-tree-branch" data-route="DENY" data-selected={resolved && route === 'DENY'}><span className="argus-mono">01 / HARD FAILURE</span><h4>DENY</h4><p>Hard authorization condition failed.</p><small>Intent, verification, merchant,<br />category, or hard limit.</small></div>
        <div className="argus-tree-branch" data-route="REVIEW" data-selected={resolved && route === 'REVIEW'}><span className="argus-mono">02 / APPROVAL REQUIRED</span><h4>REVIEW</h4><p>Hard checks passed.<br />Human approval required.</p><small>Policy threshold: {money(scenario.policy.approvalThreshold)}</small></div>
        <div className="argus-tree-branch" data-route="AUTHORIZE" data-selected={resolved && route === 'AUTHORIZE'}><span className="argus-mono">03 / CHECKS PASSED</span><h4>AUTHORIZE</h4><p>All required checks passed.<br />No human approval required.</p><small>requires_approval = FALSE</small></div>
      </div>
    </div>
    <CaptionSwap changed={resolved} before="Hard failure → deny. Otherwise approval required → review. Otherwise → authorize." after="Authorization is the output of application logic." />
  </>
}

export const SceneView = memo(function SceneView({ scene, time, reduced }: { scene: SceneDefinition; time: number; reduced: boolean }) {
  const fields = (items: Field[], code = false) => <Fields items={items} time={time} duration={scene.duration} code={code} />
  const progress = reduced ? 1 : clamp01(time / 1200)
  switch (scene.id) {
    case 'INTRO': return <>
      <div className="argus-intro-title"><span className="argus-mono">THE AUTHORITY TO PAY</span><h3>ARGUS<span aria-hidden="true">.</span></h3><p>Independent authorization<br />for agentic commerce.</p></div>
      <SystemMap active={time >= 1300 ? 'USER' : ''} />
    </>
    case 'USER_INTENT': return <>
      <Heading eyebrow="HUMAN-DEFINED" title="It starts with intent." />
      <div className="argus-scene-columns"><div className="argus-request"><span className="argus-mono">USER REQUEST</span><blockquote>“{scenario.request}”</blockquote></div><div className="argus-panel"><span className="argus-mono">POLICY PROFILE</span>{fields([['Category', scenario.policy.category], ['Budget cap', money(scenario.policy.budget)], ['Merchant policy', scenario.policy.merchantPolicy], ['Approval threshold', money(scenario.policy.approvalThreshold)]])}</div></div>
    </>
    case 'AGENT_PURCHASE': return <>
      <Heading eyebrow="SHOPPING AGENT" title="A candidate becomes an attempt." />
      <div className="argus-attempt-scene"><div className="argus-moving-purchase" style={{ '--travel': reduced ? 0 : clamp01((time - 1400) / 1000) } as CSSProperties}><Purchase status={time >= 1100 ? 'ATTEMPTING CHECKOUT' : 'CANDIDATE FOUND'} /></div><div className="argus-attempt-track" aria-hidden="true"><span /><i>ARGUS</i><span /></div><div className="argus-payment-end"><span className="argus-mono">PAYMENT</span><strong>Unavailable</strong><span>No credential</span></div></div>
    </>
    case 'INTERCEPT': return <>
      <Heading eyebrow="AUTHORIZATION BOUNDARY" title={<>Purchase attempt<br />intercepted.</>} />
      <div className="argus-intercept-layout"><div className="argus-inspection"><Ring progress={progress} /><span className="argus-mono">ARGUS</span></div><div className="argus-intercept-record"><span className="argus-mono">TRANSACTION HELD FOR EVALUATION</span><strong>{purchase.product}</strong><span>{purchase.merchant} / {amount}</span><p>No payment credential released.</p></div><div className="argus-closed-path"><span aria-hidden="true">⊣</span><span className="argus-mono">PAYMENT<br />UNAVAILABLE</span></div></div>
      <p className="argus-scene-caption">The agent can propose a purchase. It does not hold payment authority.</p>
    </>
    case 'TRUST_BOUNDARY': return <>
      <Heading eyebrow="CONTEXT ISOLATION" title="The source of intent matters." />
      <div className="argus-trust-layout"><div className="argus-clean-context"><span className="argus-mono">ORIGINAL CONVERSATION</span><p>“{scenario.request}”</p><div className="argus-clean-connector" data-active={time >= 800} aria-hidden="true"><span>↓</span></div><div className="argus-evaluator"><span className="argus-mono">INTENT EVALUATOR</span><strong>Clean user context only</strong><small>MODEL-ASSISTED INTERPRETATION</small></div></div><div className="argus-external-context"><span className="argus-mono">BROWSING CONTEXT</span><div className="argus-page-stack" aria-hidden="true"><i /><i /><i /></div><p>Product pages<br />Merchant content</p><small className="argus-mono">UNTRUSTED EXTERNAL CONTEXT</small></div></div>
      <CaptionSwap changed={time >= 2200} before="Intent is reconstructed from clean user context." after="Browsing context remains outside the intent boundary." />
    </>
    case 'INTENT_EXTRACTION': return <>
      <Heading eyebrow="MODEL-ASSISTED INTERPRETATION" title="From language to structure." />
      <div className="argus-scene-columns"><div className="argus-request"><blockquote>“{scenario.request}”</blockquote><span className="argus-mono">ORIGINAL CONVERSATION →</span></div><div className="argus-panel argus-inspected-panel"><span className="argus-mono">INTENT PROFILE</span>{fields([['Product type', scenario.interpretation.productType], ['Required feature', scenario.interpretation.requiredFeature], ['Maximum amount', money(scenario.interpretation.maximumAmount)], ['Category', scenario.interpretation.category]])}</div></div>
    </>
    case 'POLICY': return <>
      <Heading eyebrow="DETERMINISTIC POLICY EVALUATION" title="Explicit rules. Explicit results." />
      <div className="argus-rules-layout"><div className="argus-rule-aside"><span className="argus-mono">POLICY ENGINE</span><strong>Constraints,<br />evaluated.</strong><p>Independent of model interpretation.</p></div><div className="argus-panel">{fields([['Merchant allowed', policyResult.merchant_allowed], ['Category allowed', policyResult.category_allowed], ['Within hard spending limit', policyResult.within_hard_limit], ['Within user budget', policyResult.within_user_budget], ['Human approval required', policyResult.requires_approval]])}<span className="argus-panel-note argus-mono">requires_approval ← POLICY OUTPUT</span></div></div>
    </>
    case 'VERIFICATION': return <>
      <Heading eyebrow="MODEL-ASSISTED VERIFICATION" title="Does the purchase match?" />
      <div className="argus-verification-layout"><div className="argus-comparison"><div><span className="argus-mono">EXPECTED PURCHASE</span><strong>Noise-canceling headphones</strong><p>Maximum {money(scenario.policy.budget)}<br />Approved retailer</p></div><div><span className="argus-mono">PROPOSED PURCHASE</span><strong>{purchase.product}</strong><p>Noise-canceling headphones<br />{amount} / {purchase.merchant}</p></div></div><div className="argus-panel"><span className="argus-mono">VERIFICATION RESULT</span>{fields([['Intent match', verificationResult.intent_match], ['Merchant valid', verificationResult.merchant_valid], ['Amount valid', verificationResult.amount_valid], ['Material intent drift', verificationResult.material_intent_drift], ['Verification passed', verificationResult.verification_passed]])}</div></div>
    </>
    case 'DECISION_INPUT': return <>
      <Heading eyebrow="INTERPRETATION COMPLETE" title="Structured input. Application logic." />
      <div className="argus-input-transfer"><div className="argus-panel argus-authorization-object"><span className="argus-mono">AUTHORIZATION INPUT</span>{fields(Object.entries(authorizationInput), true)}</div><span className="argus-transfer-arrow" aria-hidden="true">→</span><div className="argus-engine-target"><span className="argus-mono">NEXT</span><strong>DECISION<br />ENGINE</strong><span className="argus-mono">NO AUTHORIZATION ISSUED</span></div></div>
    </>
    case 'DECISION_TREE': return <DecisionTree time={time} reduced={reduced} />
    case 'CREDENTIAL': return <>
      <Heading eyebrow="AUTHORITY, CONSTRAINED" title="Scoped payment authority." />
      <div className="argus-credential-layout"><div className="argus-authorized-stamp"><Ring progress={progress} /><strong>AUTHORIZED</strong><span className="argus-mono">DECISION ENGINE OUTPUT</span></div><div className="argus-panel argus-credential" data-credential="active"><span className="argus-mono">SCOPED PAYMENT CREDENTIAL</span>{fields([['Merchant lock', purchase.merchant], ['Amount lock', amount], ['Use limit', '1 transaction'], ['Status', 'ACTIVE']])}</div></div>
      <p className="argus-scene-caption">Authorization creates this credential. Before it, none existed.</p>
    </>
    case 'PAYMENT': return <>
      <Heading eyebrow="ENFORCEMENT" title="Payment permitted." />
      <div className="argus-enabled-payment" data-payment="enabled"><div><span className="argus-mono">SCOPED CREDENTIAL</span><strong>{purchase.merchant}<br />{amount}</strong><span>1 transaction</span></div><svg viewBox="0 0 300 30" aria-hidden="true"><path d="M0 15H285M275 5L285 15 275 25" className="argus-wire" /><path d="M0 15H285M275 5L285 15 275 25" className="argus-signal" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} /></svg><div className="argus-payment-destination"><span className="argus-mono">PAYMENT</span><strong>Enabled</strong><span>Scoped access only</span></div></div>
      <p className="argus-scene-caption">Credential valid only for the approved merchant and amount.</p>
    </>
    case 'AUDIT': return <>
      <Heading eyebrow="PERSISTED DECISION" title="Authority leaves a record." />
      <div className="argus-audit-layout"><div className="argus-rule-aside"><span className="argus-mono">AUDIT RECORD</span><strong>Recorded.<br />Timestamped.<br />Immutable.</strong></div><div className="argus-panel argus-ledger">{fields([['Decision', 'AUTHORIZED'], ['Merchant', purchase.merchant], ['Amount', amount], ['Hash', 'SHA-256'], ['Hedera HCS', 'SUBMITTED'], ['Status', 'TIMESTAMPED / IMMUTABLE']])}</div></div>
    </>
    case 'SUMMARY': return <>
      <div className="argus-summary"><span className="argus-mono">INDEPENDENT AUTHORIZATION FOR AGENTIC COMMERCE</span><h3>ARGUS<span aria-hidden="true">.</span></h3><div>{['Intent verified', 'Policy enforced', 'Decision routed', 'Payment controlled', 'Audit recorded'].map((text, index) => <p key={text}><span className="argus-mono">0{index + 1}</span>{text}</p>)}</div></div>
    </>
    case 'BANNER': return null
  }
})
