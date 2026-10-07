export const PREVIEW_DURATION = 6500
export const PREVIEW_DECISION_AT = 2800
export const PREVIEW_SIGNAL_START = 3900
export const PREVIEW_APPROVED_AT = 4850
export type PreviewState = 'PURCHASE' | 'INTERCEPT' | 'DECISION' | 'APPROVE' | 'BRAND' | 'COMPLETE'
export const previewTimeline: { state: PreviewState; start: number; announcement: string }[] = [
  { state: 'PURCHASE', start: 0, announcement: 'An AI agent attempts to make a purchase.' },
  { state: 'INTERCEPT', start: 1500, announcement: 'Argus intercepts the purchase before payment. Payment authority is withheld.' },
  { state: 'DECISION', start: PREVIEW_DECISION_AT, announcement: 'The decision engine has three possible routes: deny, human review, or approve.' },
  { state: 'APPROVE', start: PREVIEW_SIGNAL_START, announcement: 'This example follows only the approve route. Deny and human review remain possible outcomes.' },
  { state: 'BRAND', start: 5500, announcement: 'Argus. Guarding every payment.' },
  { state: 'COMPLETE', start: PREVIEW_DURATION, announcement: 'Preview complete. Replay or explore the project to see how Argus works.' },
]
export const previewClamp = (value: number) => Math.max(0, Math.min(1, value))
export function previewFrame(elapsed: number) {
  const time = Math.max(0, Math.min(PREVIEW_DURATION, elapsed))
  const scene = previewTimeline.findLast(scene => time >= scene.start)!
  return {
    ...scene, elapsed: time,
    purchaseProgress: previewClamp(time / 1500),
    captureProgress: 1 - (1 - previewClamp((time - 1500) / 320)) ** 3,
    signalProgress: previewClamp((time - PREVIEW_SIGNAL_START) / (PREVIEW_APPROVED_AT - PREVIEW_SIGNAL_START)),
    brandProgress: previewClamp((time - 5500) / 140),
    intercepted: time >= 1500, treeVisible: time >= PREVIEW_DECISION_AT, approved: time >= PREVIEW_APPROVED_AT,
  }
}
