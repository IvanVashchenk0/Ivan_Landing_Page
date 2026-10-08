import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, SOURCE, hashFile } from './lib/manifest.mjs'

try {
  const args = process.argv.slice(2)
  const options = {}
  while (args.length) {
    const key = args.shift()
    if (!['--source', '--output', '--temporary'].includes(key) || !args.length) throw new Error('Usage: media:prepare-image-recognition -- [--source PATH] [--output PATH] [--temporary PATH]')
    options[key] = path.resolve(args.shift())
  }
  if (process.platform !== 'darwin') throw new Error('Image-recognition video preparation requires macOS AVFoundation. Committed derivatives support portable builds.')
  const source = options['--source'] || path.join(SOURCE, 'projects/image-recognition')
  const output = options['--output'] || path.join(ROOT, 'public/media/projects/image-recognition')
  const temporary = options['--temporary'] || path.join(ROOT, '.cache/media/swift-cache')
  await mkdir(source, { recursive: true }); await mkdir(output, { recursive: true }); await mkdir(temporary, { recursive: true })
  const originals = ['full-pipeline.mov', 'similarity.mov', 'over-write.mov', 'blur.png'].map(name => path.join(source, name))
  const before = await Promise.all(originals.map(hashFile))
  const run = (command, commandArgs) => {
    const result = spawnSync(command, commandArgs, { stdio: 'inherit' })
    if (result.error || result.status !== 0) throw new Error(`${command} preparation failed.`)
  }
  run('swift', ['-module-cache-path', temporary, path.join(ROOT, 'scripts/media/prepare/prepare-image-recognition.swift'), source, source, output])
  run('python3', [path.join(ROOT, 'scripts/media/prepare/prepare-image-recognition.py'), path.join(source, 'blur.png'), output])
  const after = await Promise.all(originals.map(hashFile))
  if (before.some((hash, index) => hash !== after[index])) throw new Error('A source asset changed during derivative preparation.')
  console.log('Image-recognition derivatives prepared; four source files remain byte-identical.')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
