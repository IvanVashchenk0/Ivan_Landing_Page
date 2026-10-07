import path from 'node:path'
import { stat } from 'node:fs/promises'
import { MANIFEST, MIME, PROJECTION, SOURCE, hashFile, loadManifest, projection, remotePath, safeRelative, walk, writeJSON } from './lib/manifest.mjs'

try {
  const args = process.argv.slice(2)
  const update = args.includes('--update-existing')
  const registrations = new Map()
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--update-existing') continue
    if (args[i] !== '--register' || !args[i + 1]?.includes('=')) throw new Error('Usage: media:manifest [--register logical.id=relative/source.ext] [--update-existing]')
    const [id, source, ...extra] = args[++i].split('=')
    if (!id || extra.length) throw new Error('Invalid registration')
    registrations.set(safeRelative(source), id)
  }
  const previous = await loadManifest()
  const bySource = new Map(Object.entries(previous.assets).map(([id, asset]) => [asset.sourcePath, { id, ...asset }]))
  const entries = []
  for (const file of await walk(SOURCE, new Set(), true)) {
    const sourcePath = path.relative(SOURCE, file).split(path.sep).join('/')
    const old = bySource.get(sourcePath)
    const sha256 = await hashFile(file), size = (await stat(file)).size
    if (old && old.sha256 !== sha256 && !update) throw new Error(`Changed original: ${old.id}. Use --update-existing only for an intentional new source version.`)
    const id = registrations.get(sourcePath) ?? old?.id ?? sourcePath
    if (old && id !== old.id) throw new Error(`Existing ID ${old.id} is stable; do not rename it through registration.`)
    registrations.delete(sourcePath); bySource.delete(sourcePath)
    entries.push([id, { sourcePath, remotePath: remotePath(sourcePath, sha256), mime: old?.mime ?? MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', size, sha256, cacheControl: 'public, max-age=31536000, immutable, no-transform' }])
  }
  if (bySource.size) throw new Error(`Missing registered sources: ${[...bySource.keys()].join(', ')}`)
  if (registrations.size) throw new Error(`Registration source not found: ${[...registrations.keys()].join(', ')}`)
  if (new Set(entries.map(([id]) => id)).size !== entries.length) throw new Error('Duplicate logical asset ID')
  const manifest = { version: 1, assets: Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) }
  await writeJSON(MANIFEST, manifest)
  await writeJSON(PROJECTION, projection(manifest))
  console.log(`Manifest updated: ${entries.length} originals. Source files were not modified.`)
} catch (error) { console.error(error.message); process.exitCode = 1 }
