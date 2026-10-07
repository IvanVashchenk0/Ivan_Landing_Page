let viewer: Promise<typeof import('./ModelViewer')> | undefined
export function preloadModelViewer() {
  return viewer ??= import('./ModelViewer').catch(error => { viewer = undefined; throw error })
}
