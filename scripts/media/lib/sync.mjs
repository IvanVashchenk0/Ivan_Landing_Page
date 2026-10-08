import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import path from 'node:path'
import { ROOT, SOURCE } from './manifest.mjs'

// Never log configuration or subprocess stderr: either may include credentials.
export async function uploadEnvironment(env = process.env, file = path.join(ROOT, '.env.media.local')) {
  const local = parseEnv(await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error }))
  const allowed = /^(R2_(BUCKET|ENDPOINT|REGION|AWS_PROFILE|PUBLIC_BASE_URL)|MEDIA_(BUCKET|ENDPOINT|REGION|PROFILE)|AWS_[A-Z0-9_]+)$/
  if (Object.keys(local).some(key => !allowed.test(key))) throw new Error('Unsupported upload setting in .env.media.local. Use R2_* non-secret settings or the optional AWS_* fallback; never VITE_ credentials.')
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
export function r2Config(env) {
  const bucket = env.R2_BUCKET || env.MEDIA_BUCKET
  const endpoint = env.R2_ENDPOINT || env.MEDIA_ENDPOINT
  const profile = env.R2_AWS_PROFILE || env.MEDIA_PROFILE || env.AWS_PROFILE
  const region = env.R2_REGION || env.MEDIA_REGION || 'auto'
  if (!bucket) throw new Error('R2_BUCKET is not configured. Fill it in .env.media.local (legacy MEDIA_BUCKET is also supported).')
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error('R2_BUCKET must be a valid existing bucket name.')
  if (!endpoint) throw new Error('R2_ENDPOINT is not configured. Paste your R2 S3 endpoint into .env.media.local.')
  let url
  try { url = new URL(endpoint) } catch { throw new Error('R2_ENDPOINT must be a valid HTTPS S3 endpoint.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('R2_ENDPOINT must be HTTPS without embedded credentials, query, or fragment.')
  if (!profile && !(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY)) throw new Error('R2_AWS_PROFILE is not configured. Set ivan-r2 and run: aws configure --profile ivan-r2')
  if (profile && !/^[a-zA-Z0-9_.-]+$/.test(profile)) throw new Error('R2_AWS_PROFILE contains unsupported characters.')
  const options = ['--endpoint-url', endpoint, '--region', region, '--no-cli-pager']
  if (profile) options.push('--profile', profile)
  return { bucket, profile, options }
}
export async function checkConnection({ env, run = awsRunner(env) }) {
  const config = r2Config(env)
  const version = await run(['--version'])
  if (version.code !== 0 || !version.stdout.startsWith('aws-cli/2.')) throw new Error('Install AWS CLI v2 before checking connectivity or synchronizing media.')
  if (config.profile) {
    const profiles = await run(['configure', 'list-profiles'])
    if (profiles.code !== 0) throw new Error('Cannot list AWS profile names. Check your AWS CLI configuration; credentials are not printed.')
    if (!profiles.stdout.split(/\r?\n/).includes(config.profile)) throw new Error(`AWS profile ${config.profile} was not found. Run: aws configure --profile ${config.profile}`)
  }
  const result = await run(['s3api', 'head-bucket', '--bucket', config.bucket, ...config.options])
  if (result.code !== 0) throw new Error('R2 connection failed. Check profile credentials, bucket-scoped permissions, R2_ENDPOINT and R2_BUCKET. Provider output is withheld to protect credentials.')
  return config
}
export async function synchronize(manifest, { env, run = awsRunner(env), source = SOURCE, log = console.log }) {
  const { bucket, options } = await checkConnection({ env, run })
  const head = async asset => {
    const result = await run(['s3api', 'head-object', '--bucket', bucket, '--key', asset.remotePath, '--output', 'json', ...options])
    if (result.code === 0) return JSON.parse(result.stdout)
    if (/\(404\)|\(NoSuchKey\)|\(NotFound\)/.test(result.stderr)) return undefined
    throw new Error('Cannot inspect remote object. Check AWS credentials, profile, endpoint, and bucket permissions. Provider output is withheld to protect credentials.')
  }
  for (const [id, asset] of Object.entries(manifest.assets)) {
    const existing = await head(asset)
    if (existing && objectMatches(asset, existing)) { log(`SKIP ${id}: matching SHA-256, size and headers`); continue }
    const result = await run(['s3', 'cp', path.join(source, asset.sourcePath), `s3://${bucket}/${asset.remotePath}`, '--content-type', asset.mime, '--cache-control', asset.cacheControl, '--metadata', `sha256=${asset.sha256}`, '--only-show-errors', ...options])
    if (result.code !== 0) throw new Error(`Upload failed for ${id}. Check credentials and storage permissions; provider output is withheld.`)
    if (!objectMatches(asset, await head(asset) ?? {})) throw new Error(`Post-upload metadata verification failed: ${id}`)
    log(`UPLOADED ${id}`)
  }
}
