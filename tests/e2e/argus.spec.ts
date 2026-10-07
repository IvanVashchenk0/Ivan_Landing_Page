import { expect, test, type Page } from '@playwright/test'
import { authorizationInput, evaluatePolicy, routeAuthorization } from '../../src/projects/argus/scenario'
import { authorizationResolved, DECISION_RESOLVED_AT, frameAt, timeline, TOTAL_DURATION } from '../../src/projects/argus/timeline'

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Product video' }))
})

const root = (page: Page) => page.locator('.argus-animation')
async function openAnimation(page: Page, path = '/projects/argus') {
  await page.clock.install()
  await page.clock.resume()
  await page.goto(path)
  if (path === '/') await page.locator('#argus').scrollIntoViewIfNeeded()
  await page.locator('.argus-animation-stage').scrollIntoViewIfNeeded()
  await expect(root(page)).toHaveAttribute('data-running', 'true')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
}
async function moveTo(page: Page, elapsed: number) {
  await root(page).getByRole('button', { name: 'Skip animation' }).click()
  await root(page).getByRole('button', { name: 'Replay', exact: true }).click()
  await page.clock.fastForward(elapsed + 30)
}

test('routing denies every hard failure before review, while policy owns approval', () => {
  expect(routeAuthorization(authorizationInput)).toBe('AUTHORIZE')
  expect(routeAuthorization({ ...authorizationInput, requires_approval: true })).toBe('REVIEW')
  for (const field of ['intent_match', 'verification_passed', 'merchant_allowed', 'category_allowed', 'within_hard_limit'] as const) {
    expect(routeAuthorization({ ...authorizationInput, [field]: false })).toBe('DENY')
    expect(routeAuthorization({ ...authorizationInput, [field]: false, requires_approval: true })).toBe('DENY')
  }
  const policy = { budget: 500, approvalThreshold: 350, merchantApproved: true, category: 'Electronics', allowedCategory: 'Electronics', withinHardLimit: true }
  expect(evaluatePolicy({ ...policy, amount: 278.49 }).requires_approval).toBe(false)
  expect(evaluatePolicy({ ...policy, amount: 350 }).requires_approval).toBe(false)
  expect(evaluatePolicy({ ...policy, amount: 350.01 }).requires_approval).toBe(true)
  expect(evaluatePolicy({ ...policy, budget: 300, amount: 301 }).within_user_budget).toBe(false)
})

test('timeline preserves all 15 scenes and authorizes only when routing resolves', () => {
  expect(timeline).toHaveLength(15)
  expect(TOTAL_DURATION).toBe(37500)
  expect(TOTAL_DURATION).toBeLessThanOrEqual(40000)
  for (const scene of timeline) {
    expect(frameAt(scene.start).scene.id).toBe(scene.id)
    expect(frameAt(scene.end - 1).scene.id).toBe(scene.id)
  }
  const routeTime = timeline.find(scene => scene.id === 'DECISION_TREE')!.start + DECISION_RESOLVED_AT
  expect(authorizationResolved(routeTime - 1)).toBe(false)
  expect(authorizationResolved(routeTime)).toBe(true)
  expect(frameAt(TOTAL_DURATION + 1000).scene.id).toBe('BANNER')
})

test('one trace separates interpretation, routing, credential creation, and payment', async ({ page }) => {
  const calls: string[] = []
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) calls.push(request.url()) })
  await openAnimation(page)
  await expect(page.getByRole('tablist', { name: 'Argus transaction scenarios' })).toHaveCount(0)
  await moveTo(page, timeline[4].start + 1200)
  await expect(root(page)).toHaveAttribute('data-scene', 'TRUST_BOUNDARY')
  await expect(root(page)).toHaveAttribute('data-authorization', 'UNRESOLVED')
  await expect(page.locator('.argus-clean-context .argus-clean-connector')).toBeVisible()
  await expect(page.locator('.argus-external-context .argus-clean-connector')).toHaveCount(0)
  await moveTo(page, timeline[9].start + 700)
  await expect(page.locator('.argus-tree-branch')).toHaveCount(3)
  for (const route of ['DENY', 'REVIEW', 'AUTHORIZE']) await expect(page.locator(`[data-route="${route}"]`)).toBeVisible()
  await expect(page.locator('[data-selected=true]')).toHaveCount(0)
  await expect(root(page)).toHaveAttribute('data-authorization', 'UNRESOLVED')
  await page.clock.runFor(2700)
  await expect(root(page)).toHaveAttribute('data-authorization', 'AUTHORIZE')
  await expect(page.locator('[data-selected=true]')).toHaveAttribute('data-route', 'AUTHORIZE')
  await expect(page.locator('[data-credential]')).not.toBeVisible()
  await expect(page.locator('[data-payment]')).not.toBeVisible()
  await moveTo(page, timeline[10].start + 1200)
  await expect(page.locator('[data-credential]')).toBeVisible()
  await expect(page.locator('[data-payment]')).not.toBeVisible()
  await moveTo(page, timeline[11].start + 1200)
  await expect(page.locator('[data-payment]')).toBeVisible()
  expect(calls).toEqual([])
})

test('pause, visibility, skip, replay and final banner are deterministic', async ({ page }) => {
  await openAnimation(page)
  await page.clock.runFor(3000)
  const scene = await root(page).getAttribute('data-scene')
  await root(page).getByRole('button', { name: 'Pause', exact: true }).click()
  await page.clock.runFor(10000)
  await expect(root(page)).toHaveAttribute('data-scene', scene!)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.locator('.argus-animation-stage').scrollIntoViewIfNeeded()
  await expect(root(page)).toHaveAttribute('data-phase', 'paused')
  await root(page).getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(root(page)).toHaveAttribute('data-running', 'false')
  const hiddenScene = await root(page).getAttribute('data-scene')
  await page.clock.runFor(10000)
  await expect(root(page)).toHaveAttribute('data-scene', hiddenScene!)
  await page.locator('.argus-animation-stage').scrollIntoViewIfNeeded()
  await expect(root(page)).toHaveAttribute('data-running', 'true')
  await root(page).getByRole('button', { name: 'Skip animation' }).click()
  await expect(root(page)).toHaveAttribute('data-phase', 'complete')
  const banner = page.getByRole('img', { name: 'ARGUS — Guarding every payment' })
  await expect(banner).toBeVisible()
  await expect(banner).toHaveJSProperty('naturalWidth', 8000)
  await expect(banner).toHaveCSS('object-fit', 'contain')
  await root(page).getByRole('button', { name: 'Replay', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(root(page)).toHaveAttribute('data-scene', 'INTRO')
  await expect(root(page)).toHaveAttribute('data-authorization', 'UNRESOLVED')
  await page.clock.fastForward(TOTAL_DURATION + 100)
  await expect(root(page)).toHaveAttribute('data-phase', 'complete')
  await expect(banner).toBeVisible()
  await page.clock.runFor(10000)
  await expect(root(page)).toHaveAttribute('data-scene', 'BANNER')
})

test('banner load failure offers retry without a substitute end card', async ({ page }) => {
  await page.route('**/ARGUS%20Banner.png*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('/projects/argus')
  await root(page).getByRole('button', { name: 'Skip animation' }).click()
  await expect(page.getByText('The Argus banner could not load.')).toBeVisible()
  await page.unroute('**/ARGUS%20Banner.png*')
  await root(page).getByRole('button', { name: 'Retry banner' }).click()
  await expect(page.getByRole('img', { name: 'ARGUS — Guarding every payment' })).toBeVisible()
  await expect(page.getByText('The Argus banner could not load.')).toHaveCount(0)
})

test('all key scenes fit desktop and portrait layouts with stable height', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 1024, 768, 700, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 })
    await openAnimation(page)
    const stage = page.locator('.argus-animation-stage')
    const initial = (await stage.boundingBox())!
    for (const index of [3, 4, 5, 6, 7, 8, 9, 10, 12, 14]) {
      await moveTo(page, timeline[index].start + (index === 9 ? 3800 : index === 14 ? 1000 : 1400))
      await expect(root(page)).toHaveAttribute('data-scene', timeline[index].id)
      const overflow = await stage.evaluate(element => {
        const box = element.getBoundingClientRect()
        return Array.from(element.querySelectorAll<HTMLElement>('.argus-scene[data-active=true] h3, .argus-scene[data-active=true] p, .argus-scene[data-active=true] dl, .argus-scene[data-active=true] .argus-tree-branch'))
          .filter(node => { const r = node.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1 || node.scrollWidth > node.clientWidth + 1 || (node.classList.contains("argus-tree-branch") && node.scrollHeight > node.clientHeight + 1) })
          .map(node => ({ name: node.className || node.tagName, bounds: node.getBoundingClientRect().toJSON(), stage: box.toJSON(), scroll: [node.scrollWidth, node.scrollHeight], client: [node.clientWidth, node.clientHeight] }))
      })
      if ([1440, 700, 390, 320].includes(width)) await stage.screenshot({ path: test.info().outputPath(`argus-${width}-${timeline[index].id}.png`) })
      expect(overflow, `${width}px / ${timeline[index].id}`).toEqual([])
      expect((await stage.boundingBox())!.height).toBeCloseTo(initial.height, 1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), JSON.stringify(await page.locator('body').evaluate(element => Array.from(element.querySelectorAll('*')).filter(node => node.getBoundingClientRect().right > window.innerWidth).map(node => ({tag: node.tagName, class: node.className, text: node.textContent?.slice(0, 60)}))))).toBeLessThanOrEqual(width)
    }
  }
})

test('project keeps system explanation and real product video after the animation', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Product video' }))
  await page.goto('/projects/argus')
  await expect(root(page)).toBeVisible()
  await expect(page.locator('.argus-implementation')).toBeVisible()
  expect(await page.locator('.argus-animation, .argus-system, .argus-working-product, .argus-implementation').evaluateAll(elements => elements.map(element => element.className)))
    .toEqual(['argus-animation', 'argus-system', 'argus-working-product', 'argus-implementation'])
  await expect(page.getByTitle('Argus working product demonstration')).toHaveAttribute('src', /start=55/)
})

test('hidden tabs freeze time and reduced motion keeps discrete scene states', async ({ page }) => {
  await openAnimation(page)
  await moveTo(page, timeline[9].start + 2200)
  const signal = page.locator('.argus-tree-desktop .argus-signal')
  const moving = Number(await signal.getAttribute('stroke-dashoffset'))
  expect(moving).toBeGreaterThan(0)
  expect(moving).toBeLessThan(1)
  await expect(root(page)).toHaveAttribute('data-authorization', 'UNRESOLVED')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(root(page)).toHaveAttribute('data-running', 'false')
  await page.clock.fastForward(20000)
  await expect(root(page)).toHaveAttribute('data-authorization', 'UNRESOLVED')
  expect(Number(await signal.getAttribute('stroke-dashoffset'))).toBe(moving)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(root(page)).toHaveAttribute('data-reduced-motion', 'true')
  await expect(signal).toHaveAttribute('stroke-dashoffset', '1')
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
  await expect(root(page)).toHaveAttribute('data-running', 'true')
  await page.clock.fastForward(1500)
  await expect(signal).toHaveAttribute('stroke-dashoffset', '0')
  await expect(root(page)).toHaveAttribute('data-authorization', 'AUTHORIZE')
  await root(page).getByRole('button', { name: 'Skip animation' }).focus()
  await page.keyboard.press('Enter')
  await expect(root(page)).toHaveAttribute('data-scene', 'BANNER')
})
