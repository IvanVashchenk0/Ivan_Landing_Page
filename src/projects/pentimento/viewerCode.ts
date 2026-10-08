import { canUseInteractivePentimentoModel } from './capabilities'

let viewer: Promise<typeof import('./ModelViewer')> | undefined
export function preloadModelViewer() {
  if (!canUseInteractivePentimentoModel()) return Promise.resolve(null)
  return viewer ??= import('./ModelViewer').catch(error => { viewer = undefined; throw error })
}
