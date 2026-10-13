import { spawnSync } from 'node:child_process'
import { access, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, SOURCE, hashFile } from './lib/manifest.mjs'

try {
  const args = process.argv.slice(2)
  const options = {}
  while (args.length) {
    const key = args.shift()
    if (!['--source', '--output', '--poster', '--ffmpeg'].includes(key) || !args.length) throw new Error('Usage: media:prepare-thermal-home -- [--source PATH] [--output PATH] [--poster PATH] [--ffmpeg PATH]')
    options[key] = path.resolve(args.shift())
  }
  const source = options['--source'] || path.join(SOURCE, 'projects/thermal-home-modeling/thermal-home-pipeline.mov')
  const output = options['--output'] || path.join(SOURCE, 'projects/thermal-home-modeling/thermal-home-pipeline-web.mp4')
  const poster = options['--poster'] || path.join(ROOT, 'public/media/projects/thermal-home-modeling/pipeline-poster.webp')
  const ffmpeg = options['--ffmpeg'] || path.join(ROOT, '.cache/media-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1')
  await Promise.all([access(source), access(ffmpeg), mkdir(path.dirname(output), { recursive: true }), mkdir(path.dirname(poster), { recursive: true })])
  const sourceHash = await hashFile(source)
  const run = commandArgs => {
    const result = spawnSync(ffmpeg, commandArgs, { stdio: 'inherit' })
    if (result.error || result.status !== 0) throw new Error('Thermal Home Modeling media preparation failed.')
  }
  run(['-hide_banner', '-loglevel', 'warning', '-y', '-i', source, '-map', '0:v:0', '-vf', "fps=30,scale='min(2560,iw)':-2:flags=lanczos", '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-level:v', '5.1', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '30', '-movflags', '+faststart', output])
  run(['-hide_banner', '-loglevel', 'warning', '-y', '-ss', '18', '-i', output, '-frames:v', '1', '-vf', "scale='min(1600,iw)':-2:flags=lanczos", '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', poster])
  if (await hashFile(source) !== sourceHash) throw new Error('The original Thermal Home Modeling recording changed during preparation.')
  console.log(JSON.stringify({ source: path.relative(ROOT, source), sourceSha256: sourceHash, output: path.relative(ROOT, output), outputSize: (await stat(output)).size, outputSha256: await hashFile(output), poster: path.relative(ROOT, poster), posterSize: (await stat(poster)).size, posterSha256: await hashFile(poster) }, null, 2))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
