import { expect, test } from '@playwright/test'

test('ME shows the AHU pipeline preview and preserves project navigation', async ({ page }) => {
  await page.goto('/me')
  const section = page.locator('#ahu-digitalization')
  await section.scrollIntoViewIfNeeded()
  const video = section.getByLabel('Complete AHU digitalization pipeline preview')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('preload', 'none')
  await expect(video).toHaveAttribute('loop', '')
  await expect(video).toHaveJSProperty('muted', true)
  await expect(section.getByRole('link', { name: 'EXPLORE PROJECT' })).toHaveAttribute('href', '/projects/ahu-digitalization')
})

test('AHU route presents exactly five lazy video exhibits in the required order', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requested: string[] = []
  page.on('request', request => { if (request.url().includes('/projects/ahu-digitalization/') && request.url().endsWith('.mp4')) requested.push(request.url()) })
  await page.goto('/projects/ahu-digitalization')
  const exhibits = page.locator('.ahu-exhibit')
  await expect(exhibits).toHaveCount(5)
  await expect(exhibits.locator('h2')).toHaveText(['SCANNING', '3D MODEL GENERATION', 'DIGITAL AHU APPLICATION', 'ENGINEERING OUTPUT', 'COMPLETE PIPELINE'])
  await expect(page.locator('.project-detail video')).toHaveCount(0)
  await expect(exhibits.locator('video')).toHaveCount(5)
  for (const video of await exhibits.locator('video').all()) {
    await expect(video).not.toHaveAttribute('src', /.+/)
    await expect(video).toHaveAttribute('preload', 'none')
  }
  expect(requested).toEqual([])
  await exhibits.first().getByRole('button', { name: 'PLAY VIDEO' }).click()
  await expect(exhibits.first().locator('video')).toHaveAttribute('src', /ahu-digitalization\/scan_explore\./)
})

test('all five AHU exhibits autoplay muted and only one remains active', async ({ page }) => {
  await page.goto('/projects/ahu-digitalization')
  const videos = page.locator('.ahu-exhibit video')
  for (let index = 0; index < 5; index++) {
    const video = videos.nth(index)
    await video.scrollIntoViewIfNeeded()
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveJSProperty('loop', true)
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).toHaveAttribute('src', /ahu-digitalization\/.+\.mp4$/)
    await expect.poll(() => video.evaluate(element => element.paused)).toBe(false)
    await expect(page.locator('.ahu-exhibit video[src]')).toHaveCount(1)
  }
})

test('AHU layout keeps full video frames on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/projects/ahu-digitalization')
  const first = page.locator('.ahu-exhibit').first()
  await first.scrollIntoViewIfNeeded()
  const box = await first.locator('.ahu-video-frame').boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(340)
  expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.04)
})

test('AHU source videos decode at their authored dimensions and durations @real-media', async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projects/ahu-digitalization')
  const expected = [4.905, 22.422, 20.487, 19.152, 67.2]
  const exhibits = page.locator('.ahu-exhibit')
  for (let index = 0; index < expected.length; index++) {
    const exhibit = exhibits.nth(index)
    await exhibit.scrollIntoViewIfNeeded()
    await exhibit.getByRole('button', { name: 'PLAY VIDEO' }).click()
    const video = exhibit.locator('video')
    await expect.poll(() => video.evaluate(element => element.readyState), { timeout: 30000 }).toBeGreaterThanOrEqual(2)
    const metadata = await video.evaluate(element => ({ width: element.videoWidth, height: element.videoHeight, duration: element.duration }))
    expect(metadata).toMatchObject({ width: 1280, height: 720 })
    expect(Math.abs(metadata.duration - expected[index])).toBeLessThan(0.15)
  }
})
