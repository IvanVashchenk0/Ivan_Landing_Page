import { loadManifest, verifySources } from './lib/manifest.mjs'
import { synchronize, uploadEnvironment } from './lib/sync.mjs'
try {
  if (process.argv.slice(2).some(arg => arg !== '--dry-run')) throw new Error('Usage: npm run media:sync -- [--dry-run]')
  const manifest = await loadManifest()
  await verifySources(manifest)
  if (process.argv.includes('--dry-run')) {
    console.log('Offline dry run: candidate objects (remote state is unknown; matching objects will be skipped during real sync).')
    // Deliberately offline: do not read secrets, invoke AWS, or make remote claims.
    for (const [id, asset] of Object.entries(manifest.assets)) console.log(JSON.stringify({ id, source: `media-source/${asset.sourcePath}`, remoteKey: asset.remotePath, size: asset.size, sha256: asset.sha256, mime: asset.mime, cacheControl: asset.cacheControl }, null, 2))
    console.log('Offline dry run: local originals verified. Remote existence/credentials were not checked. Synchronization will skip matching objects and retain earlier versions.')
  } else await synchronize(manifest, { env: await uploadEnvironment() })
} catch (error) { console.error(error.message); process.exitCode = 1 }
