import { expect, test } from '@playwright/test'

const assetNames = [
  '01-prototype-complete', '02-prototype-side', '03-mechanism-closeup', '04-hopper-closeup', '05-prototype-workbench', '06-assembly-workbench',
  '07-cad-isometric', '08-cad-front', '09-cad-side', '10-cad-top', '11-vision-result', '12-vision-result-alt', '13-original-concept-sketch', '14-cad-assembly-drawing',
]
const projectAssetNames = assetNames.slice(6)

test('first ME exhibit uses the requested assembly drawing once without loading case-study media', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/autonomous-sorting/')) requests.push(request.url()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/me')
  const section = page.locator('#autonomous-sorting')
  await section.scrollIntoViewIfNeeded()
  await expect(section.locator('.portfolio-placeholder')).toHaveCount(0)
  await expect(section.locator('.sorting-preview-frame')).toHaveCount(1)
  await expect(section.locator('.sorting-preview-frame figcaption')).toHaveText('SOLIDWORKS ASSEMBLY DRAWING')
  await expect(section.locator('.sorting-preview-frame img')).toHaveAttribute('src', /14-cad-assembly-drawing\.webp$/)
  await expect(section.locator('.sorting-preview-frame img')).toHaveCSS('object-fit', 'contain')
  await expect(section.getByText('DESIGNED / FABRICATED / TESTED', { exact: true })).toBeVisible()
  await expect(section.getByRole('link', { name: 'EXPLORE PROJECT' })).toHaveAttribute('href', '/projects/autonomous-sorting')
  await expect(section.locator('img[src$="14-cad-assembly-drawing.webp"]')).toHaveCount(1)
  expect(requests.some(url => url.includes('13-original-concept-sketch'))).toBe(false)
  expect(requests.some(url => url.includes('11-vision-result'))).toBe(false)
})

test.describe('mobile sorting preview', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('shows the assembly drawing once without duplicate slides or controls', async ({ page }) => {
    await page.goto('/me')
    const section = page.locator('#autonomous-sorting')
    await section.scrollIntoViewIfNeeded()
    await expect(section.locator('.sorting-preview-frame img')).toHaveCount(1)
    await expect(section.locator('.sorting-preview-frame img')).toHaveAttribute('src', /14-cad-assembly-drawing\.webp$/)
    await expect(section.locator('.sorting-preview-controls, .sorting-preview-slide')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})

test('project route contains the three requested exhibits and their authentic subjects', async ({ page }) => {
  await page.goto('/projects/autonomous-sorting')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AUTONOMOUS SORTING MACHINE')
  const exhibits = page.locator('.sorting-exhibit')
  await expect(exhibits).toHaveCount(3)
  await expect(exhibits.locator('h2')).toHaveText(['SYSTEM DESIGN', 'MACHINE VISION', 'TESTING & RESULTS'])
  await expect(exhibits.locator('header>.mono')).toHaveText(['01 /', '02 /', '03 /'])
  const represented = await page.locator('.sorting-case-study img').evaluateAll(images => [...new Set(images.map(image => image.getAttribute('src')?.match(/([^/]+)\.webp$/)?.[1]).filter(Boolean))].sort())
  expect(represented).toEqual([...projectAssetNames].sort())
  await expect(exhibits.nth(0).locator('.sorting-specification')).toHaveText(/3 MATERIALS.*2 BEARING SIZES.*6 TARGET CATEGORIES/)
  await expect(exhibits.nth(1).getByText('Early models trained on images from a different camera struggled in the deployed environment. Retraining with images captured by the Raspberry Pi camera improved material classification.')).toBeVisible()
  await expect(exhibits.nth(2).getByText('VALIDATED', { exact: true })).toBeVisible()
  await expect(exhibits.nth(2).getByText('REMAINING CHALLENGES', { exact: true })).toBeVisible()
  await expect(exhibits.nth(2)).toContainText('Full-system operational reliability')
  await expect(exhibits.nth(2)).toContainText('TEAM PROJECT / BRAD MULWENGE · KESIENA BEREZI · IVAN VASHCHENKO / 2025')
  await expect(page.getByText(/accuracy|fully operational|production throughput/i)).toHaveCount(0)
})

test('project images open accessibly, close by every required method, and restore focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/projects/autonomous-sorting')
  const assembly = page.getByRole('button', { name: 'Expand assembly drawing' })
  await assembly.scrollIntoViewIfNeeded()
  await assembly.click()
  const dialog = page.getByRole('dialog', { name: 'Expanded assembly drawing' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(assembly).toBeFocused()

  await assembly.click()
  await dialog.getByRole('button', { name: 'CLOSE ×' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(assembly).toBeFocused()

  await assembly.click()
  const box = (await dialog.boundingBox())!
  await page.mouse.click(box.x + 2, box.y + 2)
  await expect(dialog).not.toBeVisible()
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`preview and project layout fit ${viewport.width}×${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/me')
    const preview = page.locator('#autonomous-sorting')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('.sorting-preview')).toBeVisible()
    for (const image of await preview.locator('.sorting-preview img').all()) await expect(image).toHaveJSProperty('complete', true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await preview.screenshot({ path: info.outputPath(`sorting-preview-${viewport.width}x${viewport.height}.png`) })

    await page.goto('/projects/autonomous-sorting')
    const exhibits = page.locator('.sorting-exhibit')
    for (const image of await exhibits.locator('img').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect(image).toHaveJSProperty('complete', true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    await exhibits.nth(0).screenshot({ path: info.outputPath(`sorting-system-${viewport.width}x${viewport.height}.png`) })
    await exhibits.nth(2).screenshot({ path: info.outputPath(`sorting-results-${viewport.width}x${viewport.height}.png`) })
  })
}
