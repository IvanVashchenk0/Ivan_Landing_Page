import { expect, test, type Page } from '@playwright/test'
import { previewFrame, previewTimeline, PREVIEW_DURATION, PREVIEW_APPROVED_AT, PREVIEW_DECISION_AT } from '../../src/projects/argus/previewTimeline'

async function open(page: Page, path = '/ai') {
  await page.clock.install()
  await page.clock.resume()
  await page.goto(path)
  await page.locator('#argus').scrollIntoViewIfNeeded()
  await page.locator('.argus-preview-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('.argus-preview')).toHaveAttribute('data-running', 'true')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))
}
async function seek(page: Page, time: number) {
  const root = page.locator('.argus-preview')
  if (await root.getByRole('button', { name: 'Skip animation' }).count()) await root.getByRole('button', { name: 'Skip animation' }).click()
  await root.getByRole('button', { name: 'Replay' }).click()
  await page.locator('.argus-preview-stage').scrollIntoViewIfNeeded()
  await page.clock.runFor(20)
  await page.clock.fastForward(time)
}

test('short timeline keeps interception, neutral decision and selected route in order', () => {
  expect(PREVIEW_DURATION).toBe(6500)
  expect(PREVIEW_DECISION_AT).toBe(2800)
  expect(previewFrame(2799).treeVisible).toBe(false)
  expect(previewFrame(2800).treeVisible).toBe(true)
  expect(previewFrame(5640).brandProgress).toBe(1)
  expect(previewTimeline.map(scene => scene.state)).toEqual(['PURCHASE', 'INTERCEPT', 'DECISION', 'APPROVE', 'BRAND', 'COMPLETE'])
  for (const scene of previewTimeline) expect(previewFrame(scene.start).state).toBe(scene.state)
  expect(previewFrame(1499).intercepted).toBe(false)
  expect(previewFrame(1500).intercepted).toBe(true)
  expect(previewFrame(3300).treeVisible).toBe(true)
  expect(previewFrame(3300).approved).toBe(false)
  expect(previewFrame(PREVIEW_APPROVED_AT - 1).approved).toBe(false)
  expect(previewFrame(PREVIEW_APPROVED_AT).approved).toBe(true)
  expect(previewFrame(99999).state).toBe('COMPLETE')
})

test('request stops before payment and only one connected outcome activates', async ({ page }) => {
  const calls: string[] = []
  page.on('request', request => { if (['xhr', 'fetch'].includes(request.resourceType())) calls.push(request.url()) })
  await open(page)
  const root = page.locator('.argus-preview')
  await seek(page, 1100)
  await expect(root).toHaveAttribute('data-state', 'PURCHASE')
  await expect(root.locator('.ap-request')).toBeVisible()
  await expect(root.locator('.ap-gate')).not.toBeVisible()
  await expect(root.locator('.ap-outcome')).toHaveCount(3)
  await expect(root.locator('.ap-outcome').first()).not.toBeVisible()
  const card = (await root.locator('.ap-request').boundingBox())!
  expect(card.width).toBeGreaterThanOrEqual(150)
  expect(card.height).toBeGreaterThanOrEqual(70)
  await seek(page, 1450)
  const approaching = (await root.locator('.ap-request').boundingBox())!
  const destination = (await root.locator('.ap-payment').boundingBox())!
  expect(destination.x - approaching.x - approaching.width).toBeLessThan(85)
  expect(approaching.x + approaching.width).toBeLessThan(destination.x)
  await seek(page, 2100)
  await expect(root).toHaveAttribute('data-state', 'INTERCEPT')
  await expect(root.locator('.ap-inspection-ring')).toBeVisible()
  expect((await root.locator('.ap-request').boundingBox())!.x).toBeLessThan(approaching.x - 100)
  await expect(root.getByText('PAYMENT AUTHORITY WITHHELD')).toBeVisible()
  const request = (await root.locator('.ap-request').boundingBox())!
  const payment = (await root.locator('.ap-payment').boundingBox())!
  expect(request.x + request.width).toBeLessThan(payment.x)
  await seek(page, 3400)
  for (const route of ['DENY', 'HUMAN_REVIEW', 'APPROVE']) {
    await expect(root.locator(`[data-route="${route}"]`)).toBeVisible()
    await expect(root.locator(`[data-route="${route}"]`)).toHaveAttribute('data-active', 'false')
  }
  await expect(root.locator('.ap-decision')).toBeVisible()
  await expect(root.locator('.ap-agent')).not.toBeVisible()
  await expect(root.locator('.ap-payment')).not.toBeVisible()
  const stage = (await root.locator('.argus-preview-stage').boundingBox())!
  const treeRoot = (await root.locator('.ap-gate').boundingBox())!
  const outcome = (await root.locator('.ap-outcome-approve').boundingBox())!
  expect(outcome.y + outcome.height - treeRoot.y).toBeGreaterThan(stage.height * .6)
  expect(Number.parseFloat(await root.locator('.ap-outcome-approve strong').evaluate(node => getComputedStyle(node).fontSize))).toBeGreaterThan(30)
  await expect(root.locator('.ap-desktop .ap-active-signal')).toHaveAttribute('opacity', '0')
  await seek(page, 4650)
  await expect(root).toHaveAttribute('data-selected', 'NONE')
  const offset = Number(await root.locator('.ap-desktop .ap-active-signal').getAttribute('stroke-dashoffset'))
  expect(offset).toBeGreaterThan(0)
  expect(offset).toBeLessThan(1)
  await seek(page, 5200)
  await expect(root.locator('.ap-desktop .ap-active-signal')).toHaveAttribute('opacity', '1')
  await expect(root.locator('.ap-desktop .ap-active-signal')).not.toHaveAttribute('stroke-dasharray')
  await expect(root.locator('.ap-outcome[data-active=true]')).toHaveAttribute('data-route', 'APPROVE')
  await expect(root.locator('[data-route="DENY"]')).toBeVisible()
  await expect(root.locator('[data-route="HUMAN_REVIEW"]')).toBeVisible()
  await expect(root).not.toContainText(/Sony|Best Buy|278\.49|Gemini|Hedera|WebSockets|JWT|virtual card/i)
  expect(calls).toEqual([])
})

test('Home and AI use short preview; Explore opens the unchanged full project', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Product video' }))
  for (const path of ['/', '/ai']) {
    await open(page, path)
    await expect(page.locator('#argus .argus-preview')).toBeVisible()
    await expect(page.locator('#argus .argus-animation')).toHaveCount(0)
    await seek(page, 6500)
    await page.locator('.argus-preview').getByRole('button', { name: 'Replay' }).click()
    await expect(page).toHaveURL(new RegExp(path === '/' ? '/$' : '/ai$'))
  }
  await page.clock.resume()
  await page.locator('#argus').getByRole('link', { name: 'EXPLORE PROJECT', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/argus$/)
  await expect(page.locator('.argus-animation')).toBeVisible()
  await expect(page.locator('.argus-preview')).toHaveCount(0)
  await expect(page.getByTitle('Argus working product demonstration')).toHaveAttribute('src', /start=55/)
  await expect(page.locator('.argus-implementation')).toBeVisible()
})

test('visibility freezes time, manual pause persists, and completion never loops', async ({ page }) => {
  await open(page)
  const root = page.locator('.argus-preview')
  await seek(page, 2100)
  await root.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.locator('.argus-preview-stage').scrollIntoViewIfNeeded()
  await page.clock.fastForward(10000)
  await expect(root).toHaveAttribute('data-state', 'INTERCEPT')
  await expect(root.getByRole('button', { name: 'Resume' })).toBeVisible()
  await root.getByRole('button', { name: 'Resume' }).click()
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(root).toHaveAttribute('data-running', 'false')
  await page.clock.fastForward(10000)
  await expect(root).toHaveAttribute('data-state', 'INTERCEPT')
  await page.locator('.argus-preview-stage').scrollIntoViewIfNeeded()
  await expect(root).toHaveAttribute('data-running', 'true')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(root).toHaveAttribute('data-running', 'false')
  await page.clock.fastForward(10000)
  await expect(root).toHaveAttribute('data-state', 'INTERCEPT')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(root).toHaveAttribute('data-running', 'true')
  await page.clock.fastForward(5000)
  await expect(root).toHaveAttribute('data-state', 'COMPLETE')
  await page.clock.fastForward(20000)
  await expect(root).toHaveAttribute('data-state', 'COMPLETE')
  await root.getByRole('button', { name: 'Replay' }).focus()
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-state', 'PURCHASE')
})

test('original banner is the final contained frame and failed loading is recoverable', async ({ page }) => {
  await page.route('**/ARGUS%20Banner.png*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await open(page)
  await seek(page, 6500)
  await expect(page.getByText('The Argus banner could not load.')).toBeVisible()
  await expect(page.locator('.argus-preview img')).toHaveCount(1)
  await page.unroute('**/ARGUS%20Banner.png*')
  await page.getByRole('button', { name: 'Retry banner' }).click()
  const banner = page.locator('.argus-preview').getByRole('img', { name: 'ARGUS — Guarding every payment' })
  await expect(banner).toBeVisible()
  await expect(banner).toHaveJSProperty('naturalWidth', 8000)
  await expect(banner).toHaveJSProperty('naturalHeight', 4500)
  await expect(banner).toHaveCSS('object-fit', 'contain')
  await expect(page.locator('.ap-system')).toHaveCSS('visibility', 'hidden')
  await page.clock.fastForward(20000)
  await expect(banner).toBeVisible()
})

test('reduced motion uses discrete states and retains keyboard controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const root = page.locator('.argus-preview')
  await expect(root).toHaveAttribute('data-reduced-motion', 'true')
  for (const time of [2100, 3300, 4600, 5200]) {
    await seek(page, time)
    await expect(root).toHaveAttribute('data-state', previewFrame(time).state)
  }
  await expect(root.locator('.ap-desktop .ap-active-signal')).toHaveAttribute('stroke-dashoffset', '0')
  await seek(page, 5800)
  await expect(root.locator('.ap-banner')).toHaveCSS('opacity', '1')
  await seek(page, 6500)
  await root.getByRole('button', { name: 'Replay' }).focus()
  await page.keyboard.press('Enter')
  await expect(root).toHaveAttribute('data-state', 'PURCHASE')
})

test('desktop and portrait composition keep every outcome visible without clipping or height shifts', async ({ page }, info) => {
  test.setTimeout(90000)
  for (const width of [1440, 1024, 768, 701, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await open(page)
    const stage = page.locator('.argus-preview-stage')
    const height = (await stage.boundingBox())!.height
    for (const time of [900, 1500, 1850, 3300, 4700, 5200, 5700, 6500]) {
      await seek(page, time)
      const overflow = await stage.evaluate(element => {
        const bounds = element.getBoundingClientRect()
        return Array.from(element.querySelectorAll<HTMLElement>('.ap-station, .ap-request>span, .ap-gate, .ap-decision, .ap-outcome, .ap-intercept-caption, .ap-example-note')).filter(node => {
          if (getComputedStyle(node).visibility === 'hidden') return false
          const rect = node.getBoundingClientRect()
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1 || node.scrollWidth > node.clientWidth + 1
        }).map(node => node.className)
      })
      expect.soft(overflow, `${width}/${time}`).toEqual([])
      expect((await stage.boundingBox())!.height).toBeCloseTo(height, 1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if ([1440, 701, 390, 320].includes(width)) await stage.screenshot({ path: info.outputPath(`preview-${width}-${time}.png`) })
    }
  }
})
