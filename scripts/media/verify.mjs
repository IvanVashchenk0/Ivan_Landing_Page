import { loadManifest, verifySources } from './lib/manifest.mjs'
try { console.log(`Verified ${await verifySources(await loadManifest())} original media hashes.`) }
catch (error) { console.error(error.message); process.exitCode = 1 }
