import { createReadStream } from 'node:fs'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

interface Asset { sourcePath: string; remotePath: string; mime: string }
export function localMediaServer(base: string): Plugin {
  return { name: 'manifest-only-local-media', apply: 'serve', configureServer(server) {
    const prefix = `${base.replace(/\/?$/, '/')}__media/`
    server.middlewares.use(async (request, response, next) => {
      if (!request.url?.startsWith(prefix)) return next()
      if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405); response.end(); return }
      try {
        const key = decodeURIComponent(request.url.slice(prefix.length).split('?')[0])
        if (key.split('/').some(part => !part || part === '.' || part === '..') || key.includes('\\')) { response.writeHead(400); response.end(); return }
        const manifest = JSON.parse(await readFile(path.join(server.config.root, 'scripts/media/manifest.json'), 'utf8')) as { assets: Record<string, Asset> }
        const asset = Object.values(manifest.assets).find(item => item.remotePath === key)
        if (!asset) { response.writeHead(404); response.end(); return }
        const fixtures = process.env.MEDIA_TEST_FIXTURES === '1'
        const root = await realpath(path.join(server.config.root, fixtures ? 'tests/fixtures/media' : 'media-source'))
        const relative = fixtures ? asset.mime.startsWith('video/') ? 'video.mp4' : asset.mime === 'model/gltf-binary' ? 'model.glb' : 'document.pdf' : asset.sourcePath
        const file = await realpath(path.resolve(root, relative))
        if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return }
        const { size } = await stat(file)
        response.setHeader('Content-Type', asset.mime)
        response.setHeader('Accept-Ranges', 'bytes')
        response.setHeader('Cache-Control', 'no-cache')
        let start = 0, end = size - 1
        if (request.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range)
          if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return }
          start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
          end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }); response.end(); return }
          response.statusCode = 206
          response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
        }
        response.setHeader('Content-Length', end - start + 1)
        if (request.method === 'HEAD') { response.end(); return }
        const stream = createReadStream(file, { start, end })
        response.on('close', () => stream.destroy())
        stream.on('error', () => response.destroy())
        stream.pipe(response)
      } catch { response.writeHead(404); response.end('Local original unavailable. Configure VITE_MEDIA_BASE_URL or restore media-source.') }
    })
  } }
}
