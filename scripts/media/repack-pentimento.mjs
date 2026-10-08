import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { repackFile, sha256 } from './lib/glb-repack.mjs'

const source = 'media-source/projects/pentimento/Textured_mesh_1.glb'
const output = 'media-source/projects/pentimento/Textured_mesh_1_binary-repacked.glb'
try {
  if (process.argv.length > 2) throw new Error('This script takes no arguments and never overwrites an existing derivative.')
  const baseline = await readFile(source)
  if (baseline.length !== 233840976 || sha256(baseline) !== '45b568bac1c1246dd703e9827742b1d0102c4e0ffdb2535046d80ed1822026c0') throw new Error('Canonical master differs from approved baseline; STOP')
  console.log(`Verified source: ${baseline.length} bytes; SHA-256 ${sha256(baseline)}`)
  const report = await repackFile(source, output)
  await mkdir('.cache/pentimento-repack', { recursive: true })
  await writeFile('.cache/pentimento-repack/byte-verification.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(error.message); process.exitCode = 1 }
