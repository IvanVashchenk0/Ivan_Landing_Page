import { expect, test } from '@playwright/test'

test('AI exhibit uses the complete pipeline preview and keeps navigation explicit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai')
  const section = page.locator('#image-recognition')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByText('COMPLETE ANALYSIS PIPELINE / DEMONSTRATION')).toBeVisible()
  await expect(section.locator('.portfolio-placeholder')).toHaveCount(0)
  const video = section.locator('video')
  await expect(video).toHaveAttribute('poster', /full-pipeline-poster\.jpg$/)
  await expect(video).not.toHaveAttribute('src')
  await expect(section.getByRole('button', { name: 'PLAY DEMONSTRATION' })).toBeVisible()
  await expect(section.getByRole('link', { name: 'EXPLORE PROJECT', exact: true })).toHaveAttribute('href', '/projects/image-recognition')
  await section.getByRole('link', { name: 'EXPLORE PROJECT', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/image-recognition$/)
})

test('project page presents the three real exhibits in order without loading every video', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projects/image-recognition')
  const headings = page.locator('.image-recognition-exhibit h2')
  await expect(headings).toHaveText(['BLUR DETECTION', 'IMAGE SIMILARITY', 'CONCURRENT DATASET PROCESSING'])
  await expect(page.locator('.blur-diagram img')).toHaveAttribute('src', /blur-diagram\.webp$/)
  await page.getByRole('button', { name: 'EXPAND DIAGRAM' }).click()
  await expect(page.getByRole('dialog', { name: 'Expanded blur analysis diagram' })).toBeVisible()
  await page.getByRole('button', { name: 'CLOSE' }).click()
  await page.locator('.blur-diagram').screenshot({ path: test.info().outputPath('blur-desktop.png') })

  const similarity = page.getByRole('heading', { name: 'IMAGE SIMILARITY' }).locator('..').locator('..').locator('.image-recognition-video-frame')
  await similarity.scrollIntoViewIfNeeded()
  await similarity.getByRole('button', { name: 'PLAY DEMONSTRATION' }).click()
  await expect(similarity.locator('video')).toHaveAttribute('src', /similarity-web\..+\.mp4$/)
  await expect(page.locator('video[src]')).toHaveCount(1)

  const concurrent = page.getByRole('heading', { name: 'CONCURRENT DATASET PROCESSING' }).locator('..').locator('..').locator('.image-recognition-video-frame')
  await concurrent.scrollIntoViewIfNeeded()
  await concurrent.getByRole('button', { name: 'PLAY DEMONSTRATION' }).click()
  await expect(concurrent.locator('video')).toHaveAttribute('src', /over-write-web\..+\.mp4$/)
  await expect(page.locator('video[src]')).toHaveCount(1)
  expect(requests.some(url => url.includes('full-pipeline-web.'))).toBe(false)
})

test('all three demonstrations autoplay muted only while visible', async ({ page }) => {
  await page.goto('/projects/image-recognition')
  const videos = [
    page.getByLabel('Complete construction image recognition pipeline, from source collection through structured output'),
    page.getByLabel('Image similarity analysis demonstration'),
    page.getByLabel('Concurrent image dataset assignment demonstration'),
  ]
  for (const video of videos) {
    await video.scrollIntoViewIfNeeded()
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveJSProperty('loop', true)
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).toHaveAttribute('src', /image-recognition\/.+\.mp4$/)
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false)
    await expect(page.locator('video[src]')).toHaveCount(1)
  }
})

test('optimized image-recognition captures decode at their authored durations @real-media', async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projects/image-recognition')
  const expected = [
    { label: 'Complete construction image recognition pipeline, from source collection through structured output', duration: 49.23 },
    { label: 'Image similarity analysis demonstration', duration: 39.165 },
    { label: 'Concurrent image dataset assignment demonstration', duration: 41.905 },
  ]
  for (const item of expected) {
    const video = page.getByLabel(item.label)
    await video.scrollIntoViewIfNeeded()
    const frame = video.locator('..')
    await frame.getByRole('button', { name: 'PLAY DEMONSTRATION' }).click()
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState), { timeout: 30000 }).toBeGreaterThanOrEqual(2)
    const metadata = await video.evaluate(element => ({ width: (element as HTMLVideoElement).videoWidth, duration: (element as HTMLVideoElement).duration }))
    expect(metadata.width).toBeGreaterThan(0)
    expect(Math.abs(metadata.duration - item.duration)).toBeLessThan(0.15)
    await video.evaluate(element => (element as HTMLVideoElement).pause())
  }
})

test.describe('mobile blur sequence', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('uses eight faithful source crops and remains horizontally swipeable', async ({ page }) => {
    await page.goto('/projects/image-recognition')
    const rail = page.getByRole('region', { name: /Eight stages of blur analysis/ })
    await rail.scrollIntoViewIfNeeded()
    await expect(rail.locator('figure')).toHaveCount(8)
    expect(await rail.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src')))).toEqual(
      Array.from({ length: 8 }, (_, index) => `/media/projects/image-recognition/blur-stage-${index + 1}.webp`),
    )
    const before = await rail.evaluate(element => element.scrollLeft)
    await rail.evaluate(element => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }))
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(before)
    await expect(page.locator('.blur-diagram')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await rail.screenshot({ path: test.info().outputPath('blur-mobile.png') })
  })
})
