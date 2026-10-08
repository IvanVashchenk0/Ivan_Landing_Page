import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs'

// A tiny valid fixture exercises loader states without replacing the shipped model.
function triangleGLB() {
  const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0])
  const json = JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], buffers: [{ byteLength: positions.byteLength }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, -1, 0], max: [1, 1, 0] }] })
  const text = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4, ' '))
  const bytes = Buffer.alloc(12 + 8 + text.length + 8 + positions.byteLength)
  bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8)
  bytes.writeUInt32LE(text.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); text.copy(bytes, 20)
  bytes.writeUInt32LE(positions.byteLength, 20 + text.length); bytes.writeUInt32LE(0x004e4942, 24 + text.length)
  Buffer.from(positions.buffer).copy(bytes, 28 + text.length)
  return bytes
}
const fixture = [...triangleGLB()]
type Harness = { calls: number; aborts: number; urls: string[]; push: (fraction: number) => void; finish: () => void; fail: () => void }
declare global { interface Window { modelHarness: Harness; modelPhases: string[] } }

async function controlled(page: Page, options: { saveData?: boolean; effectiveType?: string; length?: boolean; cacheFailure?: boolean } = {}) {
  await page.addInitScript(({ bytes, options }) => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: options.saveData ?? false, effectiveType: options.effectiveType ?? '4g' } })
    if (options.cacheFailure) Object.defineProperty(window, 'caches', { configurable: true, value: { open: async () => { throw new Error('Storage unavailable') } } })
    const original = window.fetch.bind(window)
    let stream: ReadableStreamDefaultController<Uint8Array>, offset = 0
    const harness: Harness = { calls: 0, aborts: 0, urls: [],
      push: fraction => { const end = Math.floor(bytes.length * fraction); stream.enqueue(new Uint8Array(bytes.slice(offset, end))); offset = end },
      finish: () => { harness.push(1); stream.close() }, fail: () => stream.error(new Error('Network interrupted')),
    }
    window.modelHarness = harness
    window.fetch = (input, init) => {
      const url = String(input)
      if (!url.includes('Textured_mesh_1_binary-repacked.') && !url.includes('Textured_mesh_1024_400k.')) return original(input, init)
      harness.calls++; harness.urls.push(url); offset = 0
      init?.signal?.addEventListener('abort', () => { harness.aborts++; stream.error(new DOMException('Aborted', 'AbortError')) })
      return Promise.resolve(new Response(new ReadableStream({ start(controller) { stream = controller } }), { headers: options.length === false ? {} : { 'content-length': String(bytes.length) } }))
    }
  }, { bytes: fixture, options })
}
const modelTab = (page: Page) => page.getByRole('tab', { name: 'FINAL MODEL' })
const calls = (page: Page) => page.evaluate(() => window.modelHarness.calls)
const viewer = (page: Page) => page.locator('.object-canvas')

async function installMobileProfile(page: Page, profile: { userAgent: string; platform: string; maxTouchPoints: number; mobileHint: boolean }) {
  await page.addInitScript(profile => {
    Object.defineProperties(navigator, {
      userAgent: { configurable: true, value: profile.userAgent },
      platform: { configurable: true, value: profile.platform },
      maxTouchPoints: { configurable: true, value: profile.maxTouchPoints },
      userAgentData: { configurable: true, value: { mobile: profile.mobileHint } },
    })
  }, profile)
}

test('canonical full-size GLB retains its source hash @real-media', () => {
  const hash = '45b568bac1c1246dd703e9827742b1d0102c4e0ffdb2535046d80ed1822026c0'
  for (const path of ['media-source/projects/pentimento/Textured_mesh_1.glb']) expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(hash)
})

for (const profile of [
  { name: 'mobile Safari-like', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5, mobileHint: true },
  { name: 'Android-like', userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5, mobileHint: true },
]) {
  test(`${profile.name} loads only the mobile model after explicit selection`, async ({ page }) => {
    await installMobileProfile(page, profile)
    await controlled(page)
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/projects/pentimento')
    const tab = modelTab(page)
    await tab.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2700)
    await tab.focus()
    await tab.dispatchEvent('pointerenter', { pointerType: 'touch' })
    await tab.dispatchEvent('pointerdown', { pointerType: 'touch' })
    expect(await calls(page)).toBe(0)
    expect(requests.filter(url => url.includes('ModelViewer'))).toEqual([])
    await tab.click()
    await expect(page.locator('.pentimento-model-still')).toBeVisible()
    await expect.poll(() => calls(page)).toBe(1)
    expect(await page.evaluate(() => window.modelHarness.urls)).toHaveLength(1)
    expect((await page.evaluate(() => window.modelHarness.urls))[0]).toContain('Textured_mesh_1024_400k.')
    expect((await page.evaluate(() => window.modelHarness.urls))[0]).not.toContain('Textured_mesh_1_binary-repacked.')
    await page.evaluate(() => window.modelHarness.push(.5))
    await expect(page.getByText('50%', { exact: true })).toBeVisible()
    await expect(page.locator('.pentimento-model-still')).toHaveAttribute('data-ready', 'false')
    await page.evaluate(() => window.modelHarness.finish())
    await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
    await expect(viewer(page)).toHaveAttribute('data-model-variant', 'mobile')
    expect(Number(await viewer(page).getAttribute('data-pixel-ratio'))).toBeLessThanOrEqual(1.25)
    await expect(page.locator('.pentimento-model-still')).toHaveAttribute('data-ready', 'true')
    const canvas = await viewer(page).locator('canvas').elementHandle()
    await page.getByRole('tab', { name: 'INPUT VIDEO' }).click()
    await expect(page.locator('.pentimento-video')).toBeVisible()
    await expect(page.getByRole('button', { name: /input video/ })).toBeVisible()
    await tab.click()
    expect(await canvas!.evaluate(node => node.isConnected)).toBe(true)
    expect(await calls(page)).toBe(1)
    expect(requests.filter(url => url.includes('Textured_mesh_1_binary-repacked.'))).toEqual([])
    await canvas!.evaluate(node => node.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await expect(viewer(page)).toHaveAttribute('data-model-state', 'webgl')
    await expect(page.locator('.pentimento-model-still')).toHaveAttribute('data-ready', 'false')
    await canvas!.evaluate(node => node.dispatchEvent(new Event('webglcontextrestored')))
    await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'ME', exact: true }).click()
    await expect(page).toHaveURL(/\/me$/)
    await expect(viewer(page)).toHaveCount(0)
    expect(await canvas!.evaluate(node => node.isConnected)).toBe(false)
  })
}

test('loader safety rejection occurs before cache access or network fetch', async ({ page }) => {
  await page.goto('/ivan')
  const result = await page.evaluate(async () => {
    const { createModelLoader } = await import('/src/projects/pentimento/modelLoader.ts')
    let cacheOpens = 0
    let fetches = 0
    const loader = createModelLoader({
      allowRequest: () => false,
      openCache: async () => { cacheOpens++; return undefined },
      fetch: async () => { fetches++; return new Response() },
    })
    const error = await loader.request().then(() => '', reason => String(reason))
    return { cacheOpens, fetches, phase: loader.getSnapshot().phase, error }
  })
  expect(result).toEqual({ cacheOpens: 0, fetches: 0, phase: 'idle', error: 'Error: Pentimento model selection does not match this device.' })
})

test('approach warms viewer code; meaningful visibility fetches bytes without mounting a viewer', async ({ page }) => {
  await controlled(page)
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  expect(await calls(page)).toBe(0)
  const section = page.locator('#pentimento .experience')
  await section.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight - 900))
  await expect.poll(() => requests.some(url => url.includes('pentimento/ModelViewer.tsx'))).toBe(true)
  expect(await calls(page)).toBe(0)
  await page.locator('#pentimento').scrollIntoViewIfNeeded()
  await expect.poll(() => calls(page)).toBe(1)
  expect((await page.evaluate(() => window.modelHarness.urls))[0]).toContain('Textured_mesh_1_binary-repacked.')
  expect((await page.evaluate(() => window.modelHarness.urls))[0]).not.toContain('Textured_mesh_1024_400k.')
  await expect(viewer(page)).toHaveCount(0)
  await page.evaluate(() => window.modelHarness.finish())
  await expect(viewer(page)).toHaveCount(0)
  await modelTab(page).click()
  await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
  expect(await calls(page)).toBe(1)
})

for (const connection of [{ saveData: true }, { effectiveType: '2g' }, { effectiveType: '3g' }]) {
  test(`constrained connection ${JSON.stringify(connection)} requires model intent`, async ({ page }) => {
    await controlled(page, connection)
    await page.goto('/projects/pentimento')
    await page.waitForTimeout(2700)
    expect(await calls(page)).toBe(0)
    await modelTab(page).hover()
    await modelTab(page).focus()
    await expect.poll(() => calls(page)).toBe(1)
    await modelTab(page).click()
    await expect.poll(() => calls(page)).toBe(1)
    await page.evaluate(() => window.modelHarness.finish())
    await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
  })
}

for (const intent of ['hover', 'focus'] as const) {
  test(`${intent} starts prefetch before the visibility threshold`, async ({ page }) => {
    await controlled(page)
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.goto('/')
    const section = page.locator('#pentimento .experience')
    await section.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight + 110))
    await expect(modelTab(page)).toBeVisible()
    expect(await calls(page)).toBe(0)
    await modelTab(page)[intent]()
    await expect.poll(() => calls(page)).toBe(1)
    await expect(viewer(page)).toHaveCount(0)
  })
}

test('selection shares the active stream, reports bytes, then prepares and retains the scene across switches', async ({ page }) => {
  await controlled(page, { cacheFailure: true })
  await page.goto('/projects/pentimento')
  await expect.poll(() => calls(page)).toBe(1)
  await page.evaluate(() => window.modelHarness.push(.5))
  await modelTab(page).click()
  await expect(page.getByText('50%', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('max', String(fixture.length))
  expect(await calls(page)).toBe(1)
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.pentimento-panel[data-active=true]')).toHaveCSS('opacity', '1')
    await page.locator('.pentimento-experience').screenshot({ path: test.info().outputPath(`download-${width}.png`) })
  }
  await page.evaluate(() => {
    window.modelPhases = []
    new MutationObserver(() => {
      const phase = document.querySelector('.pentimento-loading')?.getAttribute('data-loading-phase')
      if (phase) window.modelPhases.push(phase)
    }).observe(document.querySelector('.pentimento-panels')!, { subtree: true, childList: true, attributes: true })
  })
  await page.getByRole('tab', { name: 'INPUT VIDEO' }).click()
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.evaluate(() => window.modelHarness.finish())
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  await modelTab(page).click()
  await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
  expect(await page.evaluate(() => window.modelPhases)).toContain('preparing')
  const canvas = await viewer(page).locator('canvas').elementHandle()
  await page.getByRole('tab', { name: 'INPUT VIDEO' }).click()
  await modelTab(page).click()
  expect(await canvas!.evaluate(node => node.isConnected)).toBe(true)
  expect(await calls(page)).toBe(1)
  await expect.poll(() => viewer(page).getAttribute('data-render-count')).not.toBeNull()
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const frames = await viewer(page).getAttribute('data-render-count')
  await page.waitForTimeout(200)
  expect(await viewer(page).getAttribute('data-render-count')).toBe(frames)
})

test('missing length shows received bytes without invented percentages; failures retry one stream', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await controlled(page, { length: false })
  await page.goto('/projects/pentimento')
  await modelTab(page).click()
  await expect.poll(() => calls(page)).toBe(1)
  await page.evaluate(() => window.modelHarness.push(.5))
  await expect(page.getByText(/MiB RECEIVED/)).toBeVisible()
  await expect(page.locator('.pentimento-loading')).not.toContainText('%')
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await page.evaluate(() => window.modelHarness.fail())
  await expect(page.getByText('RECONSTRUCTION COULD NOT BE LOADED.')).toBeVisible()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect.poll(() => calls(page)).toBe(2)
  await page.evaluate(() => window.modelHarness.finish())
  await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
})

test('persistent cache survives reload, preserves exact bytes, and avoids network', async ({ page }) => {
  await controlled(page)
  await page.goto('/projects/pentimento')
  await expect.poll(() => calls(page)).toBe(1)
  await page.evaluate(() => window.modelHarness.finish())
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open('pentimento-assets-v1')).match('/__media/projects/pentimento/Textured_mesh_1_binary-repacked.c5d5debee4de333d8a31e1a1c931eb1313b7964f5020475f615edd5e8f24f281.glb')))).toBe(true)
  expect(await page.evaluate(async () => [...new Uint8Array(await (await (await caches.open('pentimento-assets-v1')).match('/__media/projects/pentimento/Textured_mesh_1_binary-repacked.c5d5debee4de333d8a31e1a1c931eb1313b7964f5020475f615edd5e8f24f281.glb'))!.arrayBuffer())])).toEqual(fixture)
  await page.reload()
  await modelTab(page).click()
  await expect(viewer(page)).toHaveAttribute('data-model-state', 'ready')
  expect(await calls(page)).toBe(0)
})

test('route unmount cancels the shared stream; background failure stays silent until selection retries', async ({ page }) => {
  await controlled(page)
  await page.goto('/projects/pentimento')
  await expect.poll(() => calls(page)).toBe(1)
  await page.evaluate(() => window.modelHarness.fail())
  await expect(page.getByText('RECONSTRUCTION COULD NOT BE LOADED.')).toHaveCount(0)
  await modelTab(page).click()
  await expect.poll(() => calls(page)).toBe(2)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'ME', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.modelHarness.aborts)).toBe(1)
  await expect(viewer(page)).toHaveCount(0)
})

test('loader shares one promise, tolerates failed cache writes, and preserves completed session bytes', async ({ page }) => {
  await page.goto('/ivan')
  const result = await page.evaluate(async bytes => {
    const { createModelLoader } = await import('/src/projects/pentimento/modelLoader.ts')
    let requests = 0
    const loader = createModelLoader({ fetch: async () => { requests++; return new Response(new Uint8Array(bytes)) }, openCache: async () => ({ match: async () => undefined, put: async () => { throw new Error('Quota exceeded') } }) as unknown as Cache })
    const release = loader.retain()
    const first = loader.request(), second = loader.request()
    const samePromise = first === second
    const buffer = await first
    release()
    const third = await loader.request()
    return { samePromise, sameBytes: buffer === third, requests, state: loader.getSnapshot().phase }
  }, fixture)
  expect(result).toEqual({ samePromise: true, sameBytes: true, requests: 1, state: 'downloaded' })
})


test('local server reports the original length and serves a real byte range @real-media', async ({ request }) => {
  const path = 'media-source/projects/pentimento/Textured_mesh_1_binary-repacked.glb'
  const size = statSync(path).size
  const head = await request.head('/__media/projects/pentimento/Textured_mesh_1_binary-repacked.c5d5debee4de333d8a31e1a1c931eb1313b7964f5020475f615edd5e8f24f281.glb')
  expect(head.status()).toBe(200)
  expect(head.headers()['content-length']).toBe(String(size))
  const range = await request.get('/__media/projects/pentimento/Textured_mesh_1_binary-repacked.c5d5debee4de333d8a31e1a1c931eb1313b7964f5020475f615edd5e8f24f281.glb', { headers: { Range: 'bytes=0-11' } })
  expect(range.status()).toBe(206)
  expect(range.headers()['accept-ranges']).toBe('bytes')
  expect(range.headers()['content-range']).toBe(`bytes 0-11/${size}`)
  const header = Buffer.alloc(12), file = openSync(path, 'r')
  try { readSync(file, header, 0, 12, 0) } finally { closeSync(file) }
  expect(await range.body()).toEqual(header)
})


test('an immediate remount waits for cancellation to settle before starting one replacement request', async ({ page }) => {
  await page.goto('/ivan')
  const result = await page.evaluate(async bytes => {
    const { createModelLoader } = await import('/src/projects/pentimento/modelLoader.ts')
    let requests = 0
    let rejectFirst: (reason: unknown) => void = () => undefined
    const loader = createModelLoader({ openCache: async () => undefined, fetch: async () => {
      requests++
      if (requests === 1) return new Promise<Response>((_resolve, reject) => { rejectFirst = reject })
      return new Response(new Uint8Array(bytes))
    } })
    const release = loader.retain()
    const first = loader.request().catch(() => undefined)
    await new Promise(resolve => setTimeout(resolve, 0))
    release()
    await new Promise(resolve => setTimeout(resolve, 5))
    const releaseNext = loader.retain()
    const next = loader.request()
    const duplicate = loader.request()
    const whileAborting = requests
    rejectFirst(new DOMException('Aborted', 'AbortError'))
    await Promise.all([first, next, duplicate])
    releaseNext()
    return { whileAborting, requests, phase: loader.getSnapshot().phase }
  }, fixture)
  expect(result).toEqual({ whileAborting: 1, requests: 2, phase: 'downloaded' })
})

test('stalled input does not compete with automatic model fetch; explicit intent overrides it', async ({ page }) => {
  await controlled(page)
  await page.route('**/sarah_checkin-web.*.mp4', async route => { await new Promise(resolve => setTimeout(resolve, 5000)); await route.abort().catch(() => undefined) })
  await page.goto('/projects/pentimento')
  await expect(page.locator('.pentimento-video')).toHaveAttribute('poster', /input-poster.webp/)
  await page.waitForTimeout(2300)
  expect(await calls(page)).toBe(0)
  await modelTab(page).click()
  await expect.poll(() => calls(page)).toBe(1)
  await expect(page.locator('.pentimento-model-still')).toBeVisible()
  await expect(page.locator('.pentimento-model-still')).toHaveAttribute('data-ready','false')
  // Selecting the model explicitly releases an incompletely buffered video request.
  await expect(page.locator('.pentimento-video')).not.toHaveAttribute('src', /mp4/)
  await page.evaluate(() => window.modelHarness.push(.5))
  await expect(page.getByText('50%', { exact:true })).toBeVisible()
  await page.evaluate(() => window.modelHarness.finish())
  await expect(viewer(page)).toHaveAttribute('data-model-state','ready')
  await expect(page.locator('.pentimento-model-still')).toHaveAttribute('data-ready','true')
})

test('reduced motion keeps the input poster until user playback and removes the model crossfade', async ({ page }) => {
  await controlled(page)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/projects/pentimento')
  await page.waitForTimeout(2000)
  expect(await calls(page)).toBe(0)
  await expect(page.locator('.pentimento-video')).not.toHaveAttribute('src', /mp4/)
  await page.getByRole('button',{name:'Play input video'}).click()
  await expect(page.locator('.pentimento-video')).toHaveJSProperty('paused',false)
  await expect(page.locator('.pentimento-video')).toHaveJSProperty('playbackRate',1)
  await modelTab(page).click()
  await expect(page.locator('.pentimento-model-still')).toHaveCSS('transition-duration','0s')
})

test('unsupported 8K textures retain the still and never download or resize the GLB', async ({ page }) => {
  await controlled(page)
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getParameter
    WebGL2RenderingContext.prototype.getParameter = function(parameter) { return parameter === this.MAX_TEXTURE_SIZE ? 4096 : original.call(this,parameter) }
  })
  await page.goto('/projects/pentimento')
  await modelTab(page).click()
  await expect(page.getByText(/FULL-RESOLUTION 3D REQUIRES 8K TEXTURE SUPPORT/)).toBeVisible()
  await expect(page.locator('.pentimento-model-still')).toBeVisible()
  expect(await calls(page)).toBe(0)
  await expect(page.locator('.object-canvas canvas')).toHaveCount(0)
})

test('autoplay refusal leaves the poster and a working user playback control', async ({ page }) => {
  await controlled(page, { saveData:true })
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    let permitted = false
    document.addEventListener('click', () => { permitted = true }, true)
    HTMLMediaElement.prototype.play = function() {
      return permitted ? play.call(this) : Promise.reject(new DOMException('Autoplay disabled','NotAllowedError'))
    }
  })
  await page.goto('/projects/pentimento')
  const video = page.locator('.pentimento-video')
  await expect(video).toHaveAttribute('poster',/input-poster.webp/)
  await expect(video).toHaveJSProperty('paused',true)
  await page.getByRole('button',{name:'Play input video'}).click()
  await expect(video).toHaveJSProperty('paused',false)
  await video.evaluate((element:HTMLVideoElement) => { element.currentTime = Math.max(0,element.duration-.1) })
  await expect.poll(() => video.evaluate((element:HTMLVideoElement) => element.currentTime)).toBeLessThan(.9)
})
