import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { loadManifest, projection, remotePath, verifySources } from '../../scripts/media/lib/manifest.mjs'
import { objectMatches, synchronize, uploadEnvironment } from '../../scripts/media/lib/sync.mjs'

const manifest = await loadManifest()
const modelURL = '/__media/' + manifest.assets['pentimento.model'].remotePath

test('media URL contracts preserve bases, hashes, versioned cache keys and local opt-in', async ({ page }) => {
  await page.goto('/ivan')
  const result = await page.evaluate(async () => {
    const { resolveMediaUrl, mediaUrl, localMedia } = await import('/src/data/media/config.ts')
    const id = 'pentimento.model'
    let missing = false
    try { resolveMediaUrl(id, { basePath: '/', local: false }) } catch { missing = true }
    return { missing, remote: resolveMediaUrl(id, { basePath: '/portfolio/', mediaBase: 'https://cdn.example/media/', local: false }), local: resolveMediaUrl(id, { basePath: '/portfolio/', local: true }), current: mediaUrl(id), banner: localMedia('media/projects/argus/ARGUS%20Banner.png') }
  })
  expect(result.missing).toBe(true)
  expect(result.remote).toBe('https://cdn.example/media/' + manifest.assets['pentimento.model'].remotePath)
  expect(result.local).toBe('/portfolio' + modelURL)
  expect(result.current).toBe(modelURL)
  expect(result.banner).toBe('/media/projects/argus/ARGUS%20Banner.png')
  expect(remotePath('projects/model.glb', 'a'.repeat(64))).not.toBe(remotePath('projects/model.glb', 'b'.repeat(64)))
  expect(JSON.stringify(projection(manifest))).not.toContain('sourcePath')
})

test('local media only serves manifested files, supports HEAD and real byte ranges', async ({ request }) => {
  const fixture = await readFile('tests/fixtures/media/model.glb')
  const head = await request.head(modelURL)
  expect(head.status()).toBe(200)
  expect(head.headers()['content-length']).toBe(String(fixture.length))
  expect(head.headers()['content-type']).toBe('model/gltf-binary')
  for (const range of ['bytes=0-11', 'bytes=-12', 'bytes=12-']) {
    const response = await request.get(modelURL, { headers: { Range: range } })
    expect(response.status()).toBe(206)
    expect(response.headers()['accept-ranges']).toBe('bytes')
    expect(await response.body()).toEqual(range === 'bytes=0-11' ? fixture.subarray(0,12) : range === 'bytes=-12' ? fixture.subarray(-12) : fixture.subarray(12))
  }
  for (const range of ['bytes=999999-', 'bytes=0-1,5-6', 'bytes=-0', 'garbage']) expect((await request.get(modelURL, { headers: { Range: range } })).status()).toBe(416)
  expect((await request.get('/__media/private.env')).status()).toBe(404)
  expect((await request.get('/__media/%2e%2e%2f.env.media.local')).status()).toBe(400)
  expect((await request.post(modelURL)).status()).toBe(405)
})

test('source verification detects missing, changed and unregistered files without updating baselines', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ivan-media-test-'))
  try {
    const bytes = Buffer.from('test original'), sha256 = createHash('sha256').update(bytes).digest('hex')
    const demo = { version: 1, assets: { demo: { sourcePath: 'demo.glb', size: bytes.length, sha256 } } }
    await writeFile(path.join(root,'demo.glb'), bytes)
    expect(await verifySources(demo, root)).toBe(1)
    await writeFile(path.join(root,'demo.glb'), 'changed')
    await expect(verifySources(demo, root)).rejects.toThrow('hash mismatch')
    await writeFile(path.join(root,'demo.glb'), bytes)
    await writeFile(path.join(root,'extra.mov'), 'unregistered')
    await expect(verifySources(demo, root)).rejects.toThrow('media:manifest')
    await rm(path.join(root,'extra.mov')); await rm(path.join(root,'demo.glb'))
    await expect(verifySources(demo, root)).rejects.toThrow('Missing source')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('sync uses SHA metadata and size, skips matches, uploads new versions, never deletes', async () => {
  const asset = manifest.assets['pentimento.model']
  const head = { ContentLength: asset.size, Metadata: { sha256: asset.sha256 }, ContentType: asset.mime, CacheControl: asset.cacheControl, ETag: 'multipart-not-a-hash-42' }
  expect(objectMatches(asset, head)).toBe(true)
  expect(objectMatches(asset, { ...head, ContentLength: asset.size - 1 })).toBe(false)
  expect(objectMatches(asset, { ...head, Metadata: { sha256: 'old' } })).toBe(false)
  for (const existing of ['same', 'missing', 'different']) {
    let uploaded = false
    const commands: string[][] = []
    const run = async (args: string[]) => {
      commands.push(args)
      if (args[0] === '--version') return { code: 0, stdout: 'aws-cli/2.31.0', stderr: '' }
      if (args[1] === 'cp') { uploaded = true; return { code: 0, stdout: '', stderr: '' } }
      if (existing === 'missing' && !uploaded) return { code: 254, stdout: '', stderr: 'An error occurred (404)' }
      return { code: 0, stdout: JSON.stringify(existing === 'different' && !uploaded ? { ...head, Metadata: {} } : head), stderr: '' }
    }
    await synchronize({ assets: { demo: asset } }, { env: { MEDIA_BUCKET: 'test-bucket', MEDIA_ENDPOINT: 'https://example.r2.cloudflarestorage.com', MEDIA_PROFILE: 'test', MEDIA_REGION: 'auto' }, run, log: () => {} })
    expect(uploaded).toBe(existing !== 'same')
    expect(commands.flat()).not.toContain('delete-object')
    if (uploaded) {
      const upload = commands.find(args => args[1] === 'cp')!
      expect(upload).toContain(`sha256=${asset.sha256}`)
      expect(upload).toContain(asset.mime)
      expect(upload).toContain(asset.cacheControl)
      expect(upload).toContain('s3://test-bucket/' + asset.remotePath)
    }
  }
})

test('sync fails closed on credentials or missing configuration and never echoes secrets', async () => {
  await expect(synchronize(manifest, { env: {}, run: () => { throw new Error('must not call CLI') } })).rejects.toThrow('MEDIA_BUCKET')
  await expect(synchronize(manifest, { env: { MEDIA_BUCKET: 'test-bucket' }, run: async args => args[0] === '--version' ? { code: 0, stdout: 'aws-cli/2.0', stderr: '' } : { code: 254, stdout: '', stderr: '403 private-secret' } })).rejects.toThrow('credentials')
  const root = await mkdtemp(path.join(tmpdir(), 'ivan-secrets-'))
  try {
    const file = path.join(root, '.env.media.local')
    await writeFile(file, 'MEDIA_BUCKET=test-bucket\nAWS_SECRET_ACCESS_KEY=private-secret\n')
    expect((await uploadEnvironment({ MEDIA_BUCKET: 'override' }, file)).MEDIA_BUCKET).toBe('override')
    await writeFile(file, 'VITE_SECRET=private-secret')
    await expect(uploadEnvironment({}, file)).rejects.toThrow('never VITE_')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('manifest registration, explicit updates, offline dry run and production guards work without originals', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ivan-tooling-'))
  try {
    // Isolate the tooling with one tiny source; the repository manifest remains untouched.
    const { cp } = await import('node:fs/promises')
    await cp('scripts/media', path.join(root,'scripts/media'), { recursive: true })
    await mkdir(path.join(root,'src/data/media'), { recursive: true }); await mkdir(path.join(root,'media-source'))
    await writeFile(path.join(root,'scripts/media/manifest.json'), JSON.stringify({ version: 1, assets: {} }))
    await writeFile(path.join(root,'media-source/demo.glb'), 'original')
    const run = (script: string, args: string[] = []) => spawnSync(process.execPath, [path.join(root,'scripts/media',script), ...args], { encoding: 'utf8', env: { PATH: '/nonexistent' } })
    expect(run('manifest.mjs', ['--register', 'demo=demo.glb']).status).toBe(0)
    const dry = run('sync.mjs', ['--dry-run'])
    expect(dry.status).toBe(0); expect(dry.stdout).toContain('Offline dry run')
    await writeFile(path.join(root,'media-source/demo.glb'), 'new content')
    expect(run('manifest.mjs').status).toBe(1)
    expect(run('manifest.mjs', ['--update-existing']).status).toBe(0)
    const actual = run('sync.mjs')
    expect(actual.status).toBe(1); expect(actual.stderr).toContain('MEDIA_BUCKET')
  } finally { await rm(root, { recursive: true, force: true }) }
  for (const settings of [{ VITE_MEDIA_BASE_URL: '', VITE_USE_LOCAL_MEDIA: '' }, { VITE_MEDIA_BASE_URL: 'https://cdn.example', VITE_USE_LOCAL_MEDIA: 'true' }]) {
    const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { encoding: 'utf8', env: { ...process.env, ...settings } })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(settings.VITE_USE_LOCAL_MEDIA ? 'cannot use local originals' : 'require VITE_MEDIA_BASE_URL')
  }
})
