import { pentimentoModelVariant } from './capabilities'

let viewer: Promise<typeof import('./ModelViewer')> | undefined
export function preloadModelViewer(explicitMobileSelection = false) {
  if (pentimentoModelVariant() === 'mobile' && !explicitMobileSelection) return Promise.resolve(null)
  return viewer ??= import('./ModelViewer').catch(error => { viewer = undefined; throw error })
}
