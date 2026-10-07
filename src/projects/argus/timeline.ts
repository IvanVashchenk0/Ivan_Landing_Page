export type SceneId = 'INTRO' | 'USER_INTENT' | 'AGENT_PURCHASE' | 'INTERCEPT' | 'TRUST_BOUNDARY' | 'INTENT_EXTRACTION' | 'POLICY' | 'VERIFICATION' | 'DECISION_INPUT' | 'DECISION_TREE' | 'CREDENTIAL' | 'PAYMENT' | 'AUDIT' | 'SUMMARY' | 'BANNER'

export interface SceneDefinition { id: SceneId; duration: number; label: string; announcement: string }
// Editorial targets in milliseconds. Change timings here; every visual derives
// from this one timeline. Total includes the final one-second banner crossfade.
const definitions: SceneDefinition[] = [
  { id: 'INTRO', duration: 2000, label: 'The system', announcement: 'Argus is an independent authorization layer between the shopping agent and payment.' },
  { id: 'USER_INTENT', duration: 2500, label: 'Human intent', announcement: 'The user requests noise-canceling headphones under $300, with an explicit policy profile.' },
  { id: 'AGENT_PURCHASE', duration: 2500, label: 'Shopping agent', announcement: 'The agent proposes Sony WH-1000XM6 headphones from Best Buy for $278.49 and attempts checkout.' },
  { id: 'INTERCEPT', duration: 2500, label: 'Interception', announcement: 'Argus intercepts the purchase attempt. No payment credential has been released.' },
  { id: 'TRUST_BOUNDARY', duration: 4000, label: 'Trust boundary', announcement: 'Only original conversation enters intent evaluation. Browsing context remains outside the boundary.' },
  { id: 'INTENT_EXTRACTION', duration: 2500, label: 'Intent extraction', announcement: 'Model-assisted interpretation produces structured intent: headphones, noise-canceling, maximum $300, electronics.' },
  { id: 'POLICY', duration: 2500, label: 'Policy engine', announcement: 'Deterministic policy checks pass. Human approval is not required.' },
  { id: 'VERIFICATION', duration: 2500, label: 'Purchase verification', announcement: 'The proposed purchase matches expected intent, merchant, and amount. Verification passes without material intent drift.' },
  { id: 'DECISION_INPUT', duration: 1500, label: 'Authorization input', announcement: 'Structured verification and policy outputs enter deterministic application logic. No authorization has been issued yet.' },
  { id: 'DECISION_TREE', duration: 5000, label: 'Deterministic routing', announcement: 'One decision root has three possible routes: deny, review, or authorize. Hard checks pass and no human approval is required; the engine selects authorize.' },
  { id: 'CREDENTIAL', duration: 3000, label: 'Scoped credential', announcement: 'Authorization creates a single-use credential locked to Best Buy and $278.49.' },
  { id: 'PAYMENT', duration: 2000, label: 'Payment enabled', announcement: 'Payment is now permitted only for the approved merchant and amount.' },
  { id: 'AUDIT', duration: 2000, label: 'Audit record', announcement: 'The demonstration records the authorized decision with SHA-256 and illustrates submission to Hedera HCS.' },
  { id: 'SUMMARY', duration: 2000, label: 'System summary', announcement: 'Intent verified. Policy enforced. Decision routed. Payment controlled. Audit recorded.' },
  { id: 'BANNER', duration: 1000, label: 'Argus', announcement: 'Argus. Guarding every payment. Animation complete.' },
]
let start = 0
export const timeline = definitions.map(definition => {
  const scene = { ...definition, start, end: start + definition.duration }
  start = scene.end
  return scene
})
export const TOTAL_DURATION = start
export const DECISION_SIGNAL_START = 1300
export const DECISION_RESOLVED_AT = 3300
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
export function frameAt(elapsed: number) {
  const index = Math.max(0, timeline.findIndex(scene => elapsed < scene.end))
  const sceneIndex = elapsed >= TOTAL_DURATION ? timeline.length - 1 : index
  const scene = timeline[sceneIndex]
  return { scene, index: sceneIndex, localTime: Math.max(0, Math.min(scene.duration, elapsed - scene.start)) }
}
export function authorizationResolved(elapsed: number) {
  return elapsed >= timeline.find(scene => scene.id === 'DECISION_TREE')!.start + DECISION_RESOLVED_AT
}
export function fieldVisible(localTime: number, index: number, count: number, duration: number) {
  return localTime >= 150 + index * Math.min(260, (duration - 600) / Math.max(1, count))
}
