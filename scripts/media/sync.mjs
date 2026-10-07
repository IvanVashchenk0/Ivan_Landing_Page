import { loadManifest, verifySources } from './lib/manifest.mjs'
import { synchronize, uploadEnvironment } from './lib/sync.mjs'
try {
  if (process.argv.slice(2).some(arg => arg !== '--dry-run')) throw new Error('Usage: npm run media:sync -- [--dry-run]')
  const manifest = await loadManifest()
  await verifySources(manifest)
  if (process.argv.includes('--dry-run')) {
    // Deliberately offline: do not read secrets, invoke AWS, or make remote claims.
    for (const [id, asset] of Object.entries(manifest.assets)) console.log(`PLAN ${id}: ${asset.size} bytes → ${asset.remotePath}`)
    console.log('Offline dry run: local originals verified. Remote existence/credentials were not checked. Synchronization will skip matching objects and retain earlier versions.')
  } else await synchronize(manifest, { env: await uploadEnvironment() })
} catch (error) { console.error(error.message); process.exitCode = 1 }
