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

test.describe('mobile reconstruction safety', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
  })

  test('iPhone visitors can switch tabs and continue browsing without loading the GLB', async ({ page }) => {
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/projects/pentimento')
    const modelTab = page.getByRole('tab', { name: 'FINAL MODEL' })
    await modelTab.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2700)
    await modelTab.focus()
    await modelTab.dispatchEvent('pointerenter', { pointerType: 'touch' })
    await modelTab.dispatchEvent('pointerdown', { pointerType: 'touch' })
    await modelTab.tap()
    await expect(page.getByText('FULL-RESOLUTION INTERACTIVE RECONSTRUCTION AVAILABLE ON DESKTOP')).toBeVisible()
    await expect(page.locator('.pentimento-model-still')).toBeVisible()
    await expect(page.locator('.object-canvas, .pentimento-model-canvas')).toHaveCount(0)
    await page.getByRole('tab', { name: 'INPUT VIDEO' }).tap()
    await expect(page.locator('.pentimento-video')).toBeVisible()
    await expect(page.getByRole('button', { name: /input video/ })).toBeVisible()
    await modelTab.tap()
    await expect(page.locator('.pentimento-model-still')).toBeVisible()
    await page.locator('footer').scrollIntoViewIfNeeded()
    await expect(page.locator('footer')).toBeVisible()
    expect(requests.filter(url => url.includes('.glb'))).toEqual([])
    expect(requests.filter(url => url.includes('ModelViewer'))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
