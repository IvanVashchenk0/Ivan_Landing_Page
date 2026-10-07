import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import path from 'node:path'
import { ROOT, SOURCE } from './manifest.mjs'

// Never log configuration or subprocess stderr: either may include credentials.
export async function uploadEnvironment(env = process.env, file = path.join(ROOT, '.env.media.local')) {
  const local = parseEnv(await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error }))
  const allowed = /^(MEDIA_(BUCKET|ENDPOINT|REGION|PROFILE)|AWS_[A-Z0-9_]+)$/
  if (Object.keys(local).some(key => !allowed.test(key))) throw new Error('Unsupported upload setting in .env.media.local. Use MEDIA_* storage settings or AWS_* credentials; never VITE_ credentials.')
  return { ...local, ...env }
}
export function awsRunner(env) {
  return args => new Promise((resolve, reject) => {
    const child = spawn('aws', args, { env: { ...env, AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off' }, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', () => reject(new Error('AWS CLI v2 is unavailable. Install it only if synchronizing media.')))
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
}
export function objectMatches(asset, head) {
  return head.ContentLength === asset.size && head.Metadata?.sha256 === asset.sha256 && head.ContentType === asset.mime && head.CacheControl === asset.cacheControl
}
export async function synchronize(manifest, { env, run = awsRunner(env), source = SOURCE, log = console.log }) {
  if (!env.MEDIA_BUCKET || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.MEDIA_BUCKET)) throw new Error('Set MEDIA_BUCKET to an existing bucket. No bucket is created by this script.')
  const options = ['--region', env.MEDIA_REGION || 'auto', '--no-cli-pager']
  if (env.MEDIA_ENDPOINT) {
    const url = new URL(env.MEDIA_ENDPOINT)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('MEDIA_ENDPOINT must be an HTTPS endpoint without credentials or query parameters.')
    options.push('--endpoint-url', env.MEDIA_ENDPOINT)
  }
  if (env.MEDIA_PROFILE) options.push('--profile', env.MEDIA_PROFILE)
  const version = await run(['--version'])
  if (version.code !== 0 || !version.stdout.startsWith('aws-cli/2.')) throw new Error('Media synchronization requires AWS CLI v2.')
  const head = async asset => {
    const result = await run(['s3api', 'head-object', '--bucket', env.MEDIA_BUCKET, '--key', asset.remotePath, '--output', 'json', ...options])
    if (result.code === 0) return JSON.parse(result.stdout)
    if (/\(404\)|\(NoSuchKey\)|\(NotFound\)/.test(result.stderr)) return undefined
    throw new Error('Cannot inspect remote object. Check AWS credentials, profile, endpoint, and bucket permissions. Provider output is withheld to protect credentials.')
  }
  for (const [id, asset] of Object.entries(manifest.assets)) {
    const existing = await head(asset)
    if (existing && objectMatches(asset, existing)) { log(`SKIP ${id}: matching SHA-256, size and headers`); continue }
    const result = await run(['s3', 'cp', path.join(source, asset.sourcePath), `s3://${env.MEDIA_BUCKET}/${asset.remotePath}`, '--content-type', asset.mime, '--cache-control', asset.cacheControl, '--metadata', `sha256=${asset.sha256}`, '--only-show-errors', ...options])
    if (result.code !== 0) throw new Error(`Upload failed for ${id}. Check credentials and storage permissions; provider output is withheld.`)
    if (!objectMatches(asset, await head(asset) ?? {})) throw new Error(`Post-upload metadata verification failed: ${id}`)
    log(`UPLOADED ${id}`)
  }
}
