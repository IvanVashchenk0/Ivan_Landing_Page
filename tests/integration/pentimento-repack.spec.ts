import { test, expect, chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { jpegDimensions, parseGLB, verifyRepack } from '../../scripts/media/lib/glb-repack.mjs'

const source = 'media-source/projects/pentimento/Textured_mesh_1.glb'
const derivative = 'media-source/projects/pentimento/Textured_mesh_1_binary-repacked.glb'
const mobile = 'media-source/projects/pentimento/Textured_mesh_1024_400k.glb'
const artifacts = '.cache/pentimento-repack'

test('full original and binary derivative are exactly equivalent @real-media', async () => {
  test.setTimeout(120_000)
  const report = verifyRepack(await readFile(source), await readFile(derivative))
  expect(report.source.sha256).toBe('45b568bac1c1246dd703e9827742b1d0102c4e0ffdb2535046d80ed1822026c0')
  expect(report.counts).toEqual({ vertices: 4820430, triangles: 3328446, primitives: 5, materials: 5, meshes: 1, nodes: 1, images: 5 })
  expect(report.images.every(image => image.identical && image.width === 8192 && image.height === 8192)).toBe(true)
  expect(report.accessors.every(accessor => accessor.identical)).toBe(true)
  expect(report.derivative.bytes).toBeLessThan(182 * 1024 * 1024)
  await mkdir(artifacts, { recursive: true })
  await writeFile(`${artifacts}/byte-verification.json`, JSON.stringify(report,null,2)+'\n')
})

test('mobile derivative has the recorded geometry, hierarchy, materials, and 1024px textures @real-media', async () => {
  const bytes = await readFile(mobile)
  expect(bytes).toHaveLength(30_697_560)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('c3d000c498548b37e4e88cf81c0906da4321253e738dda57ffdd5cd0c08eaaed')
  const parsed = parseGLB(bytes)
  const json = parsed.json
  const primitives = json.meshes.flatMap((mesh: { primitives: { attributes: { POSITION: number; TEXCOORD_0: number }; indices: number; material: number; mode?: number }[] }) => mesh.primitives)
  expect({ scenes: json.scenes.length, nodes: json.nodes.length, meshes: json.meshes.length, primitives: primitives.length, materials: json.materials.length, textures: json.textures.length, images: json.images.length }).toEqual({ scenes: 1, nodes: 1, meshes: 1, primitives: 2, materials: 2, textures: 2, images: 2 })
  expect(json.extensionsUsed).toEqual(['KHR_materials_unlit'])
  expect(json.extensionsRequired).toEqual(['KHR_materials_unlit'])
  expect(json.scenes).toEqual([{ nodes: [0] }])
  expect(json.nodes).toEqual([{ mesh: 0 }])
  expect(json.accessors[0]).toMatchObject({ componentType: 5126, count: 755621, type: 'VEC3' })
  expect(json.accessors[1]).toMatchObject({ componentType: 5126, count: 755621, type: 'VEC2' })
  expect(primitives.reduce((total: number, primitive: { indices: number }) => total + json.accessors[primitive.indices].count / 3, 0)).toBe(809979)
  expect(primitives.every((primitive: { mode?: number }) => (primitive.mode ?? 4) === 4)).toBe(true)
  expect(primitives.every((primitive: { indices: number }) => json.accessors[primitive.indices].componentType === 5125)).toBe(true)
  expect(json.materials).toEqual([
    expect.objectContaining({ alphaMode: 'OPAQUE', emissiveFactor: [1, 1, 1], pbrMetallicRoughness: expect.objectContaining({ metallicFactor: 0, roughnessFactor: 1 }) }),
    expect.objectContaining({ alphaMode: 'OPAQUE', emissiveFactor: [1, 1, 1], pbrMetallicRoughness: expect.objectContaining({ metallicFactor: 0, roughnessFactor: 1 }) }),
  ])
  const imageReports = json.images.map((image: { bufferView: number; mimeType: string }) => {
    const view = json.bufferViews[image.bufferView]
    const imageBytes = parsed.buffers[view.buffer].subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
    return { mimeType: image.mimeType, bytes: imageBytes.length, hash: createHash('sha256').update(imageBytes).digest('hex'), ...jpegDimensions(imageBytes) }
  })
  expect(imageReports).toEqual([
    { mimeType: 'image/jpeg', bytes: 246059, hash: 'a74e1310c0ff4ac341c7028b2b8fe8f127e4c5143a4d3a903d08409913fa9a90', width: 1024, height: 1024 },
    { mimeType: 'image/jpeg', bytes: 210069, hash: '2453ac552bd91345d07ae991a97611fc2ae2f79f472f9b3df9dba681d624f1cb', width: 1024, height: 1024 },
  ])
})

test('four-view render equality and alternating fresh-browser benchmarks @real-media', async () => {
  test.setTimeout(900_000)
  await mkdir(artifacts, { recursive: true })
  // Test-only local stream server permits pre-registration validation. No app middleware changes.
  const files = { '/original.glb': source, '/repacked.glb': derivative }
  const server = createServer(async (req,res) => {
    const file = files[req.url as keyof typeof files]
    if (!file) { res.writeHead(404); res.end(); return }
    const size = (await stat(file)).size
    res.writeHead(200, { 'Content-Type':'model/gltf-binary', 'Content-Length':size, 'Access-Control-Allow-Origin':'*', 'Cache-Control':'no-store' })
    createReadStream(file).pipe(res)
  })
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  const address = server.address() as { port: number }
  const records: object[] = [], comparisons: object[] = []
  try {
    for (let run = 0; run < 3; run++) for (const asset of run % 2 ? ['repacked','original'] : ['original','repacked']) {
      const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
      try {
        const page = await browser.newPage({ viewport: { width:1000,height:700 }, deviceScaleFactor:1 })
        page.setDefaultTimeout(180_000)
        const errors: string[] = []
        page.on('pageerror', e => errors.push(e.message))
        page.on('console', msg => { if (/resiz|context lost/i.test(msg.text())) errors.push(msg.text()) })
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled:true })
        await page.goto('/tests/fixtures/repack/index.html')
        await page.waitForFunction(() => typeof (window as any).runRepackComparison === 'function')
        const timing = await page.evaluate(url => (window as any).runRepackComparison(url), `http://127.0.0.1:${address.port}/${asset}.glb`)
        records.push({ asset, run:run+1, browser:browser.version(), ...timing })
        await writeFile(`${artifacts}/browser-timings.json`, JSON.stringify(records,null,2)+'\n')
        if (run === 0) for (const view of ['primary','opposite','detail','wide']) {
          const png = await page.evaluate(view => (window as any).captureRepackView(view),view)
          await writeFile(`${artifacts}/${asset}-${view}.png`, Buffer.from(png.split(',')[1],'base64'))
          if (asset === 'repacked') {
            const original = 'data:image/png;base64,'+(await readFile(`${artifacts}/original-${view}.png`)).toString('base64')
            const diff = await page.evaluate(async ({ original, png }) => {
              const load = async (url: string) => { const image = new Image(); image.src = url; await image.decode(); return image }
              const canvas = document.createElement('canvas'); canvas.width=1000; canvas.height=700
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(await load(original),0,0); const a=ctx.getImageData(0,0,1000,700)
              ctx.clearRect(0,0,1000,700); ctx.drawImage(await load(png),0,0); const b=ctx.getImageData(0,0,1000,700)
              const out=ctx.createImageData(1000,700)
              let changedPixels=0, maxChannelDifference=0, nonTransparentPixels=0
              for(let i=0;i<a.data.length;i+=4) {
                let changed=false
                if(a.data[i+3]) nonTransparentPixels++
                for(let c=0;c<4;c++) { const delta=Math.abs(a.data[i+c]-b.data[i+c]); changed ||= delta>0; maxChannelDifference=Math.max(maxChannelDifference,delta); if(c<3)out.data[i+c]=delta }
                out.data[i+3]=255; if(changed)changedPixels++
              }
              ctx.putImageData(out,0,0)
              return { changedPixels,maxChannelDifference,nonTransparentPixels,png:canvas.toDataURL('image/png') }
            },{ original,png })
            await writeFile(`${artifacts}/diff-${view}.png`,Buffer.from(diff.png.split(',')[1],'base64'))
            const { png: _png, ...metrics } = diff
            comparisons.push({view,...metrics})
            await writeFile(`${artifacts}/render-comparison.json`,JSON.stringify(comparisons,null,2)+'\n')
            expect(diff.nonTransparentPixels).toBeGreaterThan(1000)
            expect(diff.changedPixels, `${view} differs`).toBe(0)
          }
        }
        expect(errors).toEqual([])
      } finally { await browser.close() }
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
