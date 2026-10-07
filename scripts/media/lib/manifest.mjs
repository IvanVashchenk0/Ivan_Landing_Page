import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
export const SOURCE = path.join(ROOT, 'media-source')
export const MANIFEST = path.join(ROOT, 'scripts/media/manifest.json')
export const PROJECTION = path.join(ROOT, 'src/data/media/manifest.generated.json')
export const MIME = { '.glb': 'model/gltf-binary', '.mov': 'video/quicktime', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.csv': 'text/csv', '.zip': 'application/zip', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' }
export async function hashFile(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
export function safeRelative(relative) {
  if (!relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error(`Unsafe relative media path: ${relative}`)
  return relative
}
export function remotePath(sourcePath, hash) {
  safeRelative(sourcePath)
  const extension = path.posix.extname(sourcePath)
  return `${sourcePath.slice(0, -extension.length || undefined)}.${hash}${extension}`
}
export async function walk(directory, skip = new Set(), includeHidden = false) {
  const found = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || (!includeHidden && entry.name.startsWith('.')) || skip.has(entry.name)) continue
    const file = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not supported in media inventories: ${file}`)
    if (entry.isDirectory()) found.push(...await walk(file, skip, includeHidden))
    else if (entry.isFile()) found.push(file)
  }
  return found.sort()
}
export async function loadManifest(file = MANIFEST) {
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  if (manifest.version !== 1 || !manifest.assets || Array.isArray(manifest.assets)) throw new Error('Unsupported media manifest')
  const sources = new Set(), remote = new Set()
  for (const [id, asset] of Object.entries(manifest.assets)) {
    if (!id || !asset.mime || !Number.isSafeInteger(asset.size) || asset.size < 1 || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid media record: ${id}`)
    safeRelative(asset.sourcePath); safeRelative(asset.remotePath)
    if (sources.has(asset.sourcePath) || remote.has(asset.remotePath)) throw new Error(`Duplicate media path: ${id}`)
    if (asset.remotePath !== remotePath(asset.sourcePath, asset.sha256)) throw new Error(`Stale content address: ${id}`)
    if (asset.cacheControl !== 'public, max-age=31536000, immutable, no-transform') throw new Error(`Unexpected cache policy: ${id}`)
    sources.add(asset.sourcePath); remote.add(asset.remotePath)
  }
  return manifest
}
export function projection(manifest) {
  return Object.fromEntries(Object.entries(manifest.assets).map(([id, { sourcePath: _source, ...publicAsset }]) => [id, publicAsset]))
}
export async function verifySources(manifest, sourceRoot = SOURCE) {
  const files = await walk(sourceRoot, new Set(), true)
  const registered = new Set(Object.values(manifest.assets).map(asset => asset.sourcePath))
  for (const file of files) {
    const relative = path.relative(sourceRoot, file).split(path.sep).join('/')
    if (!registered.has(relative)) throw new Error(`Unregistered media: ${relative}. Run npm run media:manifest first.`)
  }
  const realRoot = await realpath(sourceRoot)
  for (const [id, asset] of Object.entries(manifest.assets)) {
    const file = path.join(sourceRoot, safeRelative(asset.sourcePath))
    const resolved = await realpath(file).catch(() => { throw new Error(`Missing source for ${id}: ${asset.sourcePath}`) })
    if (!resolved.startsWith(realRoot + path.sep)) throw new Error(`Source escapes media-source: ${id}`)
    if ((await stat(file)).size !== asset.size || await hashFile(file) !== asset.sha256) throw new Error(`Media hash mismatch: ${id}. Restore the original or explicitly update its manifest baseline.`)
  }
  return Object.keys(manifest.assets).length
}
export async function writeJSON(file, value) {
  const content = JSON.stringify(value, null, 2) + '\n'
  if (await readFile(file, 'utf8').catch(() => '') !== content) await writeFile(file, content)
}
