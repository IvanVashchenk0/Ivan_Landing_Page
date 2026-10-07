import { expect, test, type Page } from '@playwright/test'
import { timeline } from '../../src/projects/monte-carlo/timeline'

async function start(page: Page, route = '/projects/monte-carlo') {
  await page.clock.install()
  await page.clock.resume()
  await page.goto(route)
  if (route === '/') await page.locator('#monte-carlo').scrollIntoViewIfNeeded()
  await page.locator('.future-film-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('.future-film')).toHaveAttribute('data-running', 'true')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
}
async function seek(page: Page, elapsed: number) {
  const film = page.locator('.future-film')
  if (await film.getByRole('button', { name: 'Skip animation' }).count()) await film.getByRole('button', { name: 'Skip animation' }).click()
  await film.getByRole('button', { name: 'Replay' }).click()
  await page.locator('.future-film-stage').scrollIntoViewIfNeeded()
  await page.clock.runFor(40)
  await page.clock.fastForward(elapsed)
}

test('Home and AI explain; project page retains the fresh interactive simulator', async ({ page }) => {
  for (const route of ['/', '/ai']) {
    await page.goto(route)
    await page.locator('#monte-carlo').scrollIntoViewIfNeeded()
    await expect(page.locator('.future-film')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run 10,000 futures' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Explore the interactive model' })).toHaveAttribute('href', '/projects/monte-carlo#futures-simulator')
  }
  await page.getByRole('link', { name: 'Explore the interactive model' }).click()
  await expect(page.getByRole('heading', { name: 'Explore the model.' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Run 10,000 futures' })).toBeVisible()
  await expect(page.locator('.future-film')).toHaveAttribute('data-running', 'false')
})

test('single clock runs scenes in order, skips early and late, and replays the same sample', async ({ page }) => {
  await start(page)
  const film = page.locator('.future-film')
  for (const scene of timeline) {
    await seek(page, scene.start + scene.duration * .85)
    await expect(film).toHaveAttribute('data-scene', scene.id)
    await expect(film.locator('.ff-scene[data-active="true"]')).toHaveCount(1)
  }
  await seek(page, 11000)
  const sample = await film.locator('.ff-scene[data-active="true"] .ff-result').innerText()
  await film.getByRole('button', { name: 'Skip animation' }).click()
  await expect(film).toHaveAttribute('data-complete', 'true')
  await expect(film).toHaveAttribute('data-scene', 'FRAMEWORK')
  await seek(page, 11000)
  expect(await film.locator('.ff-scene[data-active="true"] .ff-result').innerText()).toBe(sample)
  await seek(page, 47000)
  await film.getByRole('button', { name: 'Skip animation' }).click()
  await page.clock.fastForward(60000)
  await expect(film).toHaveAttribute('data-scene', 'FRAMEWORK')
  await seek(page, 49000)
  await expect(film.getByRole('button', { name: 'Replay' })).toBeVisible()
  await seek(page, 0)
  await expect(film).toHaveAttribute('data-scene', 'SETUP')
})

test('manual pause survives visibility changes and hidden tabs freeze the clock', async ({ page }) => {
  await start(page)
  const film = page.locator('.future-film')
  await seek(page, 8000)
  await film.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.clock.runFor(100)
  await page.clock.fastForward(10000)
  await page.locator('.future-film-stage').scrollIntoViewIfNeeded()
  await page.clock.runFor(100)
  await expect(film).toHaveAttribute('data-scene', 'ONE_FUTURE')
  await expect(film).toHaveAttribute('data-running', 'false')
  await film.getByRole('button', { name: 'Resume' }).click()
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(film).toHaveAttribute('data-running', 'false')
  await page.clock.fastForward(15000)
  await expect(film).toHaveAttribute('data-scene', 'ONE_FUTURE')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.clock.runFor(50)
  await page.clock.fastForward(5000)
  await expect(film).toHaveAttribute('data-scene', 'FULL_PATH')
  await page.locator('#futures-simulator').scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-running', 'false')
  await page.clock.fastForward(10000)
  await expect(film).toHaveAttribute('data-scene', 'FULL_PATH')
})

test('reduced motion retains scenes and keyboard playback controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page)
  const film = page.locator('.future-film')
  await expect(film).toHaveAttribute('data-reduced-motion', 'true')
  await film.getByRole('button', { name: 'Pause', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(film.getByRole('button', { name: 'Resume' })).toBeFocused()
  for (const scene of timeline) {
    await seek(page, scene.start + 500)
    await expect(film).toHaveAttribute('data-scene', scene.id)
    await expect(film.locator('.ff-scene[data-active="true"]')).toHaveCSS('opacity', '1')
  }
  await film.getByRole('button', { name: 'Skip animation' }).focus()
  await page.keyboard.press('Enter')
  await expect(film).toHaveAttribute('data-complete', 'true')
})

test('key scenes fit stable desktop, tablet and portrait stages', async ({ page }, info) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [1440, 1024, 768, 701, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await start(page)
    const stage = page.locator('.future-film-stage')
    const box = (await stage.boundingBox())!
    const height = box.height
    if (width > 700) expect(box.width / height).toBeCloseTo(16 / 9, 2)
    for (const id of ['INPUTS', 'ONE_FUTURE', 'FULL_PATH', 'DISCOUNT', 'HISTOGRAM', 'CVAR', 'VEHICLES', 'COMPARISON', 'SENSITIVITY', 'FRAMEWORK']) {
      const scene = timeline.find(scene => scene.id === id)!
      await seek(page, scene.start + scene.duration * .9)
      expect((await stage.boundingBox())!.height).toBeCloseTo(height, 0)
      const overflow = await page.locator('.ff-scene[data-active="true"]').evaluate(element => {
        const bounds = element.closest('.ff-scenes')!.getBoundingClientRect()
        const stage = element.closest('.future-film-stage')!.getBoundingClientRect()
        return Array.from(element.querySelectorAll<HTMLElement>('div, p, h3, dl, li')).filter(node => {
          if (getComputedStyle(node).visibility === 'hidden') return false
          const rect = node.getBoundingClientRect()
          return rect.right > bounds.right + 2 || rect.left < bounds.left - 2 || rect.bottom > bounds.bottom + 2 || rect.top < bounds.top - 2 || rect.top < stage.top || rect.bottom > stage.bottom || node.scrollWidth > node.clientWidth + 2
        }).map(node => node.className)
      })
      expect.soft(overflow, `${width}/${id}`).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if ([1440, 1024, 768, 701, 700, 390, 320].includes(width)) await stage.screenshot({ path: info.outputPath(`futures-${width}-${id}.png`) })
    }
  }
  expect(errors).toEqual([])
})
