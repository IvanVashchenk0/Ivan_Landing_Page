import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashFile, safeRelative, walk } from './manifest.mjs'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const INVENTORY = path.join(ROOT, 'scripts/media/local-only.json')

export async function loadLocalOnly() {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8'))
  if (inventory.version !== 1 || !inventory.collections || Array.isArray(inventory.collections)) throw new Error('Unsupported local-only media inventory')
  for (const [directory, collection] of Object.entries(inventory.collections)) {
    safeRelative(directory); safeRelative(collection.publicPath); safeRelative(collection.publicSourcePrefix.replace(/\/$/, ''))
    if (!collection.files || Array.isArray(collection.files)) throw new Error(`Invalid local-only collection: ${directory}`)
    for (const [relative, file] of Object.entries(collection.files)) {
      safeRelative(relative)
      if (!Number.isSafeInteger(file.size) || file.size < 1 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`Invalid local-only media record: ${directory}/${relative}`)
    }
  }
  return inventory
}

export function localOnlyPrefixes(inventory) {
  return Object.keys(inventory.collections)
}

export function isLocalOnly(relative, inventory) {
  return localOnlyPrefixes(inventory).some(prefix => relative === prefix || relative.startsWith(`${prefix}/`))
}

async function verifyFile(file, expected, label) {
  const metadata = await stat(file).catch(() => { throw new Error(`Missing local-only media: ${label}`) })
  if (metadata.size !== expected.size || await hashFile(file) !== expected.sha256) throw new Error(`Local-only media hash mismatch: ${label}`)
}

export async function verifyLocalOnlySources(inventory, sourceRoot = path.join(ROOT, 'media-source')) {
  let count = 0
  const realRoot = await realpath(sourceRoot)
  for (const [directory, collection] of Object.entries(inventory.collections)) {
    const collectionRoot = path.join(sourceRoot, directory)
    const resolved = await realpath(collectionRoot).catch(() => { throw new Error(`Missing local-only collection: ${directory}`) })
    if (!resolved.startsWith(realRoot + path.sep)) throw new Error(`Local-only collection escapes media-source: ${directory}`)
    const discovered = (await walk(collectionRoot, new Set(), true)).map(file => path.relative(collectionRoot, file).split(path.sep).join('/'))
    const expected = Object.keys(collection.files).sort()
    if (JSON.stringify(discovered) !== JSON.stringify(expected)) throw new Error(`Local-only collection contents changed: ${directory}`)
    for (const [relative, baseline] of Object.entries(collection.files)) {
      await verifyFile(path.join(collectionRoot, relative), baseline, `${directory}/${relative}`)
      count++
    }
  }
  return count
}

export async function verifyLocalOnlyPublic(inventory, root = ROOT) {
  let count = 0
  for (const [directory, collection] of Object.entries(inventory.collections)) {
    const derivatives = Object.entries(collection.files).filter(([relative]) => relative.startsWith(collection.publicSourcePrefix))
    const expectedNames = derivatives.map(([relative]) => relative.slice(collection.publicSourcePrefix.length)).sort()
    const publicRoot = path.join(root, collection.publicPath)
    const discovered = (await walk(publicRoot, new Set(), true)).map(file => path.relative(publicRoot, file).split(path.sep).join('/'))
    if (JSON.stringify(discovered) !== JSON.stringify(expectedNames)) throw new Error(`Local-only public derivatives changed: ${directory}`)
    for (const [relative, baseline] of derivatives) {
      const name = relative.slice(collection.publicSourcePrefix.length)
      await verifyFile(path.join(publicRoot, name), baseline, `${collection.publicPath}/${name}`)
      count++
    }
  }
  return count
}
