import { expect, test } from '@playwright/test'
test('identity and category navigation lead to their own pages', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.getByRole('link', { name: 'Ivan Vashchenko', exact: true }).click()
  await expect(page).toHaveURL(/\/ivan$/)
  await expect(page.locator('.ivan-record')).toHaveCount(6)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'AI', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AI.')
  await expect(page.locator('.project-section')).toHaveCount(8)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'ME', exact: true }).click()
  await expect(page.locator('.project-section')).toHaveCount(8)
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Leadership' }).click()
  await expect(page.getByRole('heading', { name: 'Built with others.' })).toBeVisible()
})

test('Argus embeds the real demonstration at 55 seconds without autoplay', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Embedded player test</body></html>' }))
  await page.goto('/projects/argus')
  await expect(page).toHaveTitle('ARGUS — Ivan Vashchenko')
  const player = page.getByTitle('Argus working product demonstration')
  await expect(player).toBeVisible()
  const url = new URL((await player.getAttribute('src'))!)
  expect(url.hostname).toBe('www.youtube-nocookie.com')
  expect(url.pathname).toBe('/embed/nWmL6yigrqI')
  expect(url.searchParams.get('start')).toBe('55')
  expect(url.searchParams.get('autoplay')).toBe('0')
  expect(url.searchParams.get('controls')).toBe('1')
  await expect(player).toHaveAttribute('allowfullscreen', '')
  await expect(player).toHaveAttribute('loading', 'lazy')
  expect(await player.boundingBox()).toEqual(await page.locator('.argus-video-frame').boundingBox())
  await expect(page.getByText('SCRIPTED PREVIEW')).toHaveCount(0)
})

test('vehicle model applies changed assumptions only when run', async ({ page }) => {
  await page.goto('/projects/monte-carlo')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('10,000 FUTURES')
  await page.getByRole('button', { name: 'Run 10,000 futures' }).click()
  await expect(page.getByRole('img', { name: '8-year vehicle NPV distributions from 10,000 futures each' })).toBeVisible()
  const before = await page.locator('.futures-summary').allTextContents()
  await page.getByLabel('ANNUAL MILEAGE', { exact: true }).fill('24000')
  await expect(page.getByText('ASSUMPTIONS CHANGED — UPDATE MODEL')).toBeVisible()
  expect(await page.locator('.futures-summary').allTextContents()).toEqual(before)
  await page.getByLabel('OWNERSHIP PERIOD', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Update model' }).click()
  await expect(page.getByRole('img', { name: '10-year vehicle NPV distributions from 10,000 futures each' })).toBeVisible()
  await expect(page.getByText('10,000 FUTURES / VEHICLE · RUN 002', { exact: true })).toBeVisible()
  expect(await page.locator('.futures-summary').allTextContents()).not.toEqual(before)
})

test('real reconstruction loads once, supports orbit and zoom, and survives switching @real-media', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  const modelRequests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('Textured_mesh_1.')) modelRequests.push(request.url()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projects/pentimento')
  const input = page.getByRole('tab', { name: 'INPUT VIDEO' })
  await expect(input).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => modelRequests.length).toBe(1)
  await expect(page.locator('.object-canvas')).toHaveCount(0)
  await input.focus()
  await page.keyboard.press('ArrowRight')
  const model = page.getByRole('tab', { name: 'FINAL MODEL' })
  await expect(model).toBeFocused()
  await expect(model).toHaveAttribute('aria-selected', 'true')
  const viewer = page.getByRole('group', { name: /Interactive Pentimento reconstruction/ })
  await expect(viewer).toHaveAttribute('data-model-state', 'ready', { timeout: 90000 })
  await expect(viewer.locator('canvas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Wireframe' })).toHaveCount(0)
  const canvas = viewer.locator('canvas')
  await canvas.evaluate(element => { element.dataset.testInstance = 'retained' })
  const initialView = await canvas.screenshot()
  await viewer.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => canvas.screenshot()).not.toEqual(initialView)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
  await input.click()
  await expect(page.getByRole('tabpanel', { name: 'INPUT VIDEO' })).toBeVisible()
  await model.click()
  await expect(viewer).toHaveAttribute('data-model-state', 'ready')
  await expect(canvas).toHaveAttribute('data-test-instance', 'retained')
  expect(modelRequests).toHaveLength(1)
  expect(errors).toEqual([])
})

test('3D fallback remains readable without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/projects/pentimento')
  await page.getByRole('tab', { name: 'FINAL MODEL' }).click()
  await expect(page.getByText('3D VIEW REQUIRES WEBGL. INPUT VIDEO IS STILL AVAILABLE.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset view' })).toBeDisabled()
  await page.getByRole('tab', { name: 'INPUT VIDEO' }).click()
  await expect(page.locator('video')).toBeVisible()
})

test('direct routes load and unknown routes have a return link', async ({ page }) => {
  for (const path of ['/ivan', '/ai', '/me', '/leadership', '/projects/argus', '/projects/pentimento', '/projects/monte-carlo']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('404 / OUTSIDE THE INDEX')).toHaveCount(0)
  }
  await page.goto('/projects/missing')
  await expect(page.getByRole('link', { name: 'Return to the index' })).toBeVisible()
})

test('mobile pages and all homepage sections fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  for (const id of ['argus', 'pentimento', 'monte-carlo']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await expect(page.locator(`#${id} .experience-loading`)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: test.info().outputPath('home-mobile.png'), fullPage: true })
  for (const path of ['/ivan', '/ai', '/me', '/leadership']) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }
})

test('desktop exhibits render without browser errors', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  for (const id of ['argus', 'pentimento', 'monte-carlo']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await expect(page.locator(`#${id} .experience-loading`)).toHaveCount(0)
  }
  await page.locator('#pentimento').scrollIntoViewIfNeeded()
  await page.getByRole('tab', { name: 'FINAL MODEL' }).click()
  await expect(page.locator('#pentimento .object-canvas')).toHaveAttribute('data-model-state', 'ready', { timeout: 90000 })
  await expect(page.locator('#pentimento canvas')).toBeVisible()
  await page.locator('#pentimento').screenshot({ path: test.info().outputPath('pentimento-desktop.png') })
  await page.screenshot({ path: test.info().outputPath('home-desktop.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440)
  expect(errors).toEqual([])
})
