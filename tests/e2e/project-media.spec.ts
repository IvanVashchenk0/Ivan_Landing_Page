import { expect, test } from '@playwright/test'

test('input walkthrough plays the accelerated derivative inline at 1× and pauses when hidden or manually paused', async ({ page }) => {
  await page.goto('/')
  await page.locator('#pentimento').scrollIntoViewIfNeeded()
  const video = page.locator('#pentimento video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('preload', 'metadata')
  await expect(video).toHaveAttribute('playsinline', '')
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('loop', true)
  await expect(video).toHaveJSProperty('controls', false)
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState), { timeout: 20000 }).toBeGreaterThanOrEqual(2)
  await expect(video).toHaveJSProperty('playbackRate', 1)
  await expect(video).toHaveJSProperty('paused', false)
  await page.getByRole('button', { name: 'Pause input video' }).click()
  await expect(video).toHaveJSProperty('paused', true)
  await page.getByRole('button', { name: 'Play input video' }).click()
  await expect(video).toHaveJSProperty('paused', false)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(video).toHaveJSProperty('paused', true)
  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveJSProperty('paused', false)
})

test('failed reconstruction offers retry and keeps the input available', async ({ page }) => {
  await page.route('**/Textured_mesh_1_binary-repacked.*.glb', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('/projects/pentimento')
  await page.getByRole('tab', { name: 'FINAL MODEL' }).click()
  await expect(page.getByText('RECONSTRUCTION COULD NOT BE LOADED.')).toBeVisible()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('RECONSTRUCTION COULD NOT BE LOADED.')).toBeVisible()
  await page.getByRole('tab', { name: 'INPUT VIDEO' }).click()
  await expect(page.locator('video')).toHaveJSProperty('paused', false)
})

test('homepage trace fits the viewport and Pentimento retains its measured frame', async ({ page }) => {
  for (const [width, pentimentoHeight] of [[1440, 590], [1024, 590], [768, 590], [390, 520.796875], [320, 524.796875]]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.locator('#argus').scrollIntoViewIfNeeded()
    await expect(page.locator('.argus-preview-stage')).toBeVisible()
    const argus = await page.locator('.argus-preview-stage').boundingBox()
    expect(argus!.width).toBeLessThanOrEqual(width)
    await expect(page.locator('iframe')).toHaveCount(0)
    await page.locator('#pentimento').scrollIntoViewIfNeeded()
    await expect(page.locator('.pentimento-experience')).toBeVisible()
    const pentimento = await page.locator('.pentimento-experience').boundingBox()
    expect(Math.abs(pentimento!.height - pentimentoHeight)).toBeLessThan(1)
    await expect(page.getByRole('tab', { name: 'INPUT VIDEO' })).toHaveAttribute('aria-selected', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test.describe('mobile reconstruction', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  })

  test('iPhone visitors load only the mobile GLB after selection and retain it across tab switches', async ({ page }) => {
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/projects/pentimento')
    const modelTab = page.getByRole('tab', { name: 'FINAL MODEL' })
    await modelTab.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2700)
    await modelTab.focus()
    await modelTab.dispatchEvent('pointerenter', { pointerType: 'touch' })
    await modelTab.dispatchEvent('pointerdown', { pointerType: 'touch' })
    expect(requests.filter(url => url.includes('.glb'))).toEqual([])
    expect(requests.filter(url => url.includes('ModelViewer'))).toEqual([])
    await modelTab.tap()
    await expect(page.locator('.pentimento-model-still')).toBeVisible()
    const viewer = page.locator('.object-canvas')
    await expect(viewer).toHaveAttribute('data-model-state', 'ready')
    await expect(viewer).toHaveAttribute('data-model-variant', 'mobile')
    await expect(viewer.locator('canvas')).toHaveCSS('touch-action', 'none')
    expect(Number(await viewer.getAttribute('data-pixel-ratio'))).toBeLessThanOrEqual(1.25)
    const canvas = await viewer.locator('canvas').elementHandle()
    await page.getByRole('tab', { name: 'INPUT VIDEO' }).tap()
    await expect(page.locator('.pentimento-video')).toBeVisible()
    await expect(page.getByRole('button', { name: /input video/ })).toBeVisible()
    await modelTab.tap()
    expect(await canvas!.evaluate(node => node.isConnected)).toBe(true)
    await page.locator('footer').scrollIntoViewIfNeeded()
    await expect(page.locator('footer')).toBeVisible()
    expect(requests.filter(url => url.includes('Textured_mesh_1024_400k.'))).toHaveLength(1)
    expect(requests.filter(url => url.includes('Textured_mesh_1_binary-repacked.'))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })

  test('real mobile derivative supports one-finger orbit, pinch zoom, and reset @real-media', async ({ page }) => {
    test.setTimeout(120000)
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/projects/pentimento')
    const modelTab = page.getByRole('tab', { name: 'FINAL MODEL' })
    await modelTab.tap()
    const viewer = page.getByRole('group', { name: /Interactive Pentimento reconstruction/ })
    await expect(viewer).toHaveAttribute('data-model-state', 'ready', { timeout: 90000 })
    const canvas = viewer.locator('canvas')
    const box = (await canvas.boundingBox())!
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    const session = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points })
    const beforeOrbit = await canvas.screenshot()
    await touch('touchStart', [{ x: x - 45, y, id: 0 }])
    for (let step = 1; step <= 5; step++) await touch('touchMove', [{ x: x - 45 + step * 18, y: y - step * 4, id: 0 }])
    await touch('touchEnd', [])
    await expect.poll(() => canvas.screenshot()).not.toEqual(beforeOrbit)
    const beforeZoom = await canvas.screenshot()
    await touch('touchStart', [{ x: x - 25, y, id: 0 }, { x: x + 25, y, id: 1 }])
    for (let step = 1; step <= 5; step++) await touch('touchMove', [{ x: x - 25 - step * 8, y, id: 0 }, { x: x + 25 + step * 8, y, id: 1 }])
    await touch('touchEnd', [])
    await expect.poll(() => canvas.screenshot()).not.toEqual(beforeZoom)
    await page.getByRole('button', { name: 'Reset view' }).tap()
    await page.locator('.pentimento-experience').screenshot({ path: test.info().outputPath('pentimento-mobile-real.png') })
    expect(requests.filter(url => url.includes('Textured_mesh_1024_400k.'))).toHaveLength(1)
    expect(requests.filter(url => url.includes('Textured_mesh_1_binary-repacked.'))).toEqual([])
    await session.detach()
  })
})
