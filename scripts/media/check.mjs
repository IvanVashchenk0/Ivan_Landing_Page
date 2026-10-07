import { readFile, stat, mkdtemp, copyFile, rm } from 'node:fs/promises'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ROOT, PROJECTION, loadManifest, projection, walk } from './lib/manifest.mjs'
try {
  const manifest = await loadManifest()
  if (JSON.stringify(JSON.parse(await readFile(PROJECTION, 'utf8'))) !== JSON.stringify(projection(manifest))) throw new Error('Browser manifest is stale. Run npm run media:manifest.')
  const skip = new Set(['node_modules', 'media-source', 'dist', 'test-results', 'playwright-report', 'test-results-deployment', 'test-results-media', 'coverage', '.git', '.cache', '.codex', '.agents', '.aws'])
  // No large tracked-file exceptions. Tiny test media live outside public/.
  for (const file of await walk(ROOT, skip, true)) {
    const relative = path.relative(ROOT, file)
    if (relative.startsWith('public' + path.sep) && /\.(pdf|mp4|mov|webm|glb|gltf)$/i.test(file)) throw new Error(`Original/production media must not be deployed by Vite: ${relative}`)
    if ((await stat(file)).size > 25 * 1024 * 1024) throw new Error(`File exceeds 25 MiB: ${relative}. Move originals to media-source and register them.`)
    if (relative.startsWith('src' + path.sep) && /\.(tsx?|css)$/.test(file)) {
      const code = await readFile(file, 'utf8')
      if (/VITE_\w*(?:SECRET|ACCESS_KEY|TOKEN|PASSWORD)|\.env\.media|scripts\/media\/lib\/sync/.test(code)) throw new Error(`Upload configuration leaked into browser code: ${relative}`)
      for (const match of code.matchAll(/(?:mediaUrl\(|kind:\s*'remote',\s*id:\s*)['"]([^'"]+)['"]/g)) if (!manifest.assets[match[1]]) throw new Error(`Unregistered media ID ${match[1]} in ${relative}`)
    }
  }
  const editorial = ts.createSourceFile('editorial.ts', await readFile(path.join(ROOT, 'src/data/editorial/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
  const references = []
  const visit = node => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      const key = node.name.getText(editorial), value = node.initializer.text
      if (['image', 'companionImage'].includes(key)) references.push(stat(path.join(ROOT, 'public/media/editorial', value)).catch(() => { throw new Error(`Missing lightweight editorial asset: ${value}`) }))
      if (['pdf', 'video'].includes(key) && !manifest.assets[value]) throw new Error(`Unregistered editorial asset: ${value}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(editorial)
  await Promise.all(references)
  // Test the future tracking contract without initializing the working folder.
  const temporary = await mkdtemp(path.join(tmpdir(), 'ivan-ignore-'))
  try {
    await copyFile(path.join(ROOT, '.gitignore'), path.join(temporary, '.gitignore'))
    execFileSync('git', ['init', '--quiet', temporary])
    for (const file of ['media-source/projects/model.glb', '.env.media.local', '.env.production', '.aws/credentials', '.env.local', 'dist/index.html', 'test-results/example.png', 'node_modules/package/index.js']) {
      try { execFileSync('git', ['check-ignore', '--no-index', file], { cwd: temporary, stdio: 'pipe' }) }
      catch { throw new Error(`Missing ignore rule: ${file}`) }
    }
    for (const file of ['.env.example', 'scripts/media/manifest.json', 'src/data/media/manifest.generated.json', 'tests/fixtures/media/model.glb']) {
      let ignored = true
      try { execFileSync('git', ['check-ignore', '--no-index', file], { cwd: temporary, stdio: 'pipe' }) } catch { ignored = false }
      if (ignored) throw new Error(`Required file would be ignored: ${file}`)
    }
  } finally { await rm(temporary, { recursive: true, force: true }) }
  console.log(`Media checks passed: ${Object.keys(manifest.assets).length} manifest entries; safe projection, references, public assets, file sizes and temporary Git ignore checks. Local originals were not required.`)
} catch (error) { console.error(error.message); process.exitCode = 1 }
