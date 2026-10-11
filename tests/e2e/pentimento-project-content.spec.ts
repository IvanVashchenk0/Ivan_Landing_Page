import { expect, test } from '@playwright/test'

const website = 'https://pentimentolandingpage.vercel.app/'
const youtube = 'https://youtu.be/FA3qZ2IVGwc'

test('Pentimento project replaces generic copy with two authentic media previews', async ({ page }) => {
  const youtubeRequests: string[] = []
  page.on('request', request => { if (request.url().includes('youtube')) youtubeRequests.push(request.url()) })
  await page.goto('/projects/pentimento')
  await expect(page.getByText('The idea', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Input and output', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Further material', { exact: true })).toHaveCount(0)
  await expect(page.locator('.pentimento-experience')).toBeVisible()

  const websitePreview = page.getByRole('link', { name: 'Visit Pentimento project website' })
  await expect(websitePreview).toHaveAttribute('href', website)
  await expect(websitePreview).toHaveAttribute('target', '_blank')
  await expect(websitePreview.locator('img')).toHaveAttribute('src', /project-website\.png$/)
  await expect(websitePreview.locator('img')).toHaveAttribute('width', '1440')
  await expect(websitePreview.locator('img')).toHaveAttribute('height', '900')

  const pitch = page.locator('.pentimento-pitch-stage')
  await pitch.scrollIntoViewIfNeeded()
  await expect(pitch.locator('img')).toHaveAttribute('src', /project-pitch-thumbnail\.jpg$/)
  await expect(pitch.locator('iframe')).toHaveCount(0)
  expect(youtubeRequests).toHaveLength(0)
  await expect(page.getByRole('link', { name: 'WATCH ON YOUTUBE ↗' })).toHaveAttribute('href', youtube)
})

test('project pitch loads the privacy-enhanced YouTube player only after activation', async ({ page }) => {
  const requests: string[] = []
  await page.route('https://www.youtube-nocookie.com/**', route => {
    requests.push(route.request().url())
    return route.fulfill({ contentType: 'text/html', body: '<html><body>Pitch player</body></html>' })
  })
  await page.goto('/projects/pentimento')
  const play = page.getByRole('button', { name: 'Play Pentimento project pitch' })
  await play.scrollIntoViewIfNeeded()
  expect(requests).toHaveLength(0)
  await play.click()
  const frame = page.getByTitle('Pentimento project pitch')
  await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/FA3qZ2IVGwc\?autoplay=1/)
  await expect.poll(() => requests.length).toBe(1)
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`Pentimento project media fits ${viewport.width}×${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/projects/pentimento')
    const materials = page.locator('.pentimento-project-materials')
    await materials.scrollIntoViewIfNeeded()
    for (const image of await materials.locator('img').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect(image).toHaveJSProperty('complete', true)
      expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await materials.screenshot({ path: info.outputPath(`pentimento-project-media-${viewport.width}x${viewport.height}.png`) })
  })
}
