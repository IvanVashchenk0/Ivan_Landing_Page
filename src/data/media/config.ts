import manifest from './manifest.generated.json'

export type RemoteMediaId = keyof typeof manifest
export type MediaReference = { kind: 'local'; path: string } | { kind: 'remote'; id: RemoteMediaId }
export const remoteAssets = manifest
export function resolveMediaUrl(id: RemoteMediaId, options: { basePath: string; mediaBase?: string; local: boolean }) {
  const asset = manifest[id]
  if (!asset) throw new Error(`Unknown media asset: ${id}`)
  const encoded = asset.remotePath.split('/').map(encodeURIComponent).join('/')
  if (options.local) return `${options.basePath.replace(/\/?$/, '/')}__media/${encoded}`
  if (!options.mediaBase) throw new Error('Set VITE_MEDIA_BASE_URL to the public media CDN URL.')
  return `${options.mediaBase.replace(/\/+$/, '')}/${encoded}`
}
export function mediaUrl(id: RemoteMediaId) {
  return resolveMediaUrl(id, {
    basePath: import.meta.env.BASE_URL,
    mediaBase: import.meta.env.VITE_MEDIA_BASE_URL,
    local: import.meta.env.DEV && (import.meta.env.VITE_USE_LOCAL_MEDIA === 'true' || !import.meta.env.VITE_MEDIA_BASE_URL),
  })
}
export function localMedia(relative: string) {
  return `${import.meta.env.BASE_URL}${relative.replace(/^\/+/, '')}`
}
export const resolveMedia = (reference: MediaReference) => reference.kind === 'remote' ? mediaUrl(reference.id) : localMedia(reference.path)
