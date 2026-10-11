import { loadManifest, verifySources } from './lib/manifest.mjs'
import { loadLocalOnly, localOnlyPrefixes, verifyLocalOnlyPublic, verifyLocalOnlySources } from './lib/local-only.mjs'
try {
  const localOnly = await loadLocalOnly()
  const originals = await verifySources(await loadManifest(), undefined, localOnlyPrefixes(localOnly))
  const localSources = await verifyLocalOnlySources(localOnly)
  const localPublic = await verifyLocalOnlyPublic(localOnly)
  console.log(`Verified ${originals} remote-media originals, ${localSources} local-only source files, and ${localPublic} committed local derivatives.`)
}
catch (error) { console.error(error.message); process.exitCode = 1 }
