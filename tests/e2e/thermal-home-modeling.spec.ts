import { expect, test } from '@playwright/test'

const label = 'Thermal Home Modeling computational pipeline recording'

test('ME loads the complete pipeline preview only as it approaches the viewport', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('thermal-home-pipeline-web.') && request.url().endsWith('.mp4')) requests.push(request.url()) })
  await page.goto('/me')
  const section = page.locator('#thermal-home-modeling')
  await expect(section.locator('.portfolio-placeholder')).toHaveCount(0)
  expect(requests).toEqual([])
  await section.scrollIntoViewIfNeeded()
  const video = section.getByLabel(label)
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', /thermal-home-modeling\/thermal-home-pipeline-web\..+\.mp4$/)
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).toHaveAttribute('loop', '')
  await expect(video).toHaveAttribute('playsinline', '')
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveCSS('object-fit', 'contain')
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false)
  await expect(section.getByRole('link', { name: 'EXPLORE PROJECT' })).toHaveAttribute('href', '/projects/thermal-home-modeling')
  expect(requests).toHaveLength(1)

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(true)
})

test('reduced motion retains the authentic poster until explicit playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('thermal-home-pipeline-web.')) requests.push(request.url()) })
  await page.goto('/me')
  const section = page.locator('#thermal-home-modeling')
  await section.scrollIntoViewIfNeeded()
  const video = section.getByLabel(label)
  await expect(video).toHaveAttribute('poster', /pipeline-poster\.webp$/)
  await expect(video).not.toHaveAttribute('src')
  expect(requests).toEqual([])
  await section.getByRole('button', { name: 'PLAY VIDEO' }).click()
  await expect(video).toHaveAttribute('src', /thermal-home-pipeline-web\..+\.mp4$/)
  await expect.poll(() => requests.length).toBe(1)
})

test('replay and fullscreen controls operate without changing the Explore route', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'requestFullscreen', { configurable: true, value() { (window as typeof window & { thermalFullscreen?: number }).thermalFullscreen = ((window as typeof window & { thermalFullscreen?: number }).thermalFullscreen ?? 0) + 1; return Promise.resolve() } })
  })
  await page.goto('/me')
  const section = page.locator('#thermal-home-modeling')
  await section.scrollIntoViewIfNeeded()
  const video = section.getByLabel(label)
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
  await video.evaluate(element => { const media = element as HTMLVideoElement; media.pause(); media.currentTime = 1 })
  await section.getByRole('button', { name: 'REPLAY' }).click()
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeLessThan(0.5)
  await section.getByRole('button', { name: 'FULLSCREEN' }).click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { thermalFullscreen?: number }).thermalFullscreen)).toBe(1)
  await section.getByRole('link', { name: 'EXPLORE PROJECT' }).click()
  await expect(page).toHaveURL(/\/projects\/thermal-home-modeling$/)
  await expect(page.locator('.portfolio-placeholder')).toContainText('PROJECT CASE STUDY IN DEVELOPMENT')
  await expect(page.locator('video')).toHaveCount(0)
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`pipeline preview fits ${viewport.width}×${viewport.height} without cropping`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/me')
    const section = page.locator('#thermal-home-modeling')
    await section.scrollIntoViewIfNeeded()
    const video = section.getByLabel(label)
    const box = await video.boundingBox()
    expect(box).not.toBeNull()
    expect(Math.abs(box!.width / box!.height - 1470 / 773)).toBeLessThan(0.03)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await section.screenshot({ path: info.outputPath(`thermal-home-preview-${viewport.width}x${viewport.height}.png`) })
  })
}

test('optimized recording retains authored duration and web delivery properties @real-media', async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/me')
  const section = page.locator('#thermal-home-modeling')
  await section.scrollIntoViewIfNeeded()
  await section.getByRole('button', { name: 'PLAY VIDEO' }).click()
  const video = section.getByLabel(label)
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState), { timeout: 30000 }).toBeGreaterThanOrEqual(2)
  const metadata = await video.evaluate(element => ({ width: (element as HTMLVideoElement).videoWidth, height: (element as HTMLVideoElement).videoHeight, duration: (element as HTMLVideoElement).duration }))
  expect(metadata).toMatchObject({ width: 2560, height: 1346 })
  expect(Math.abs(metadata.duration - 63.4)).toBeLessThan(0.15)
})
