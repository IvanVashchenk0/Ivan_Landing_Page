import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, SOURCE, loadManifest, verifySources } from './lib/manifest.mjs'
try {
  const args = process.argv.slice(2)
  const options = {}
  while (args.length) {
    const key = args.shift()
    if (!['--source', '--temporary', '--output'].includes(key) || !args.length) throw new Error('Usage: media:prepare -- [--source PATH] [--temporary PATH] [--output PATH]')
    options[key] = path.resolve(args.shift())
  }
  const source = options['--source'] || SOURCE
  const temporary = options['--temporary'] || path.join(ROOT, '.cache/media')
  const output = options['--output'] || path.join(ROOT, 'public/media/editorial')
  await verifySources(await loadManifest(), source)
  if (process.platform !== 'darwin') throw new Error('Derivative regeneration uses macOS PDFKit/AVFoundation and Python 3.11+ Pillow. Committed derivatives already support portable builds.')
  await mkdir(temporary, { recursive: true })
  const run = (command, args) => { const result = spawnSync(command, args, { stdio: 'inherit' }); if (result.error || result.status !== 0) throw new Error(`${command} preparation failed. Check offline preparation prerequisites.`) }
  run('swift', ['-module-cache-path', path.join(temporary, 'swift-cache'), path.join(ROOT, 'scripts/media/prepare/render-ivan-documents.swift'), source, path.join(temporary, 'rendered')])
  run('python3', [path.join(ROOT, 'scripts/media/prepare/prepare-ivan-media.py'), '--source', source, '--temporary', temporary, '--output', output])
  await verifySources(await loadManifest(), source)
  console.log('Lightweight derivatives prepared; original bytes verified unchanged.')
} catch (error) { console.error(error.message); process.exitCode = 1 }
