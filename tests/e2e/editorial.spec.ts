import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ids = ['argus-infocus', 'engineering-newsletter', 'alumni-video', 'leadership-profile', 'pentimento-infocus', 'acmc-chronicle']
async function strip(page: Page) {
  await page.clock.install()
  await page.clock.resume()
  await page.goto('/')
  await page.locator('.material-viewport').scrollIntoViewIfNeeded()
  await page.mouse.move(1, 1)
  await expect(page.locator('.material-viewport')).toHaveAttribute('data-running', 'true')
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50))
}
const offset = (page: Page) => page.locator('.material-viewport').evaluate(element => element.scrollLeft)

test('original PDFs and clip are byte-preserved @real-media', () => {
  const expected = {
    'engineering-newsletter.pdf': 'a1b239068faeba9f006362358d325de584a3f01e8c4db89459145f5a846d6bfd',
    'acmc-chronicle.pdf': '6e3a54cde87e6cd0d69522a78bcdf727df3c819090b9a7a55ff9fac5e2ab867b',
    'alumni-video.mp4': '0295d745cafd354afaa365c20a0e7e6004252f45b4822221c1ba396962d70065',
  }
  for (const [name, hash] of Object.entries(expected)) expect(createHash('sha256').update(readFileSync(`media-source/editorial/${name.endsWith('.pdf') ? 'publications' : 'video'}/${name}`)).digest('hex')).toBe(hash)
})

test('reading pages and profile are real supplied material', () => {
  for (const [slug, count] of [['engineering-newsletter', 2], ['acmc-chronicle', 12]] as const) {
    const texts = JSON.parse(readFileSync(`public/media/editorial/${slug}/text.json`, 'utf8'))
    expect(texts).toHaveLength(count)
    for (let i = 1; i <= count; i++) expect(readFileSync(`public/media/editorial/${slug}/page-${i}.webp`).length).toBeGreaterThan(10000)
  }
  expect(JSON.parse(readFileSync('public/media/editorial/engineering-newsletter/text.json', 'utf8'))[1]).toContain('INTERNSHIP SPOTLIGHT')
})

test('six canonical records replace generic hero copy without preloading documents or third-party players', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  await expect(page.locator('.material-group')).toHaveCount(1)
  expect(await page.locator('[data-canonical=true] [data-record]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-record')))).toEqual(ids)
  await expect(page.locator('.material-strip a[tabindex="0"]')).toHaveCount(6)
  await expect(page.locator('.hero h1')).toHaveText('IVANVASHCHENKO.')
  await expect(page.locator('.hero')).not.toContainText(/SELECTED|SYSTEMS\.|SCROLL TO EXPLORE/)
  await expect(page.locator('.home-project .section-bottomline a')).toHaveCount(3)
  await expect(page.locator('.material-strip video')).not.toHaveAttribute('src')
  expect(requests.filter(url => /\.pdf|page-\d+\.webp|text\.json|alumni-video\.[a-f0-9]+\.mp4|linkedin\.com|youtube/.test(url))).toEqual([])
})

test('strip scrolls at its configured pace and pauses for hover, focus, manual pause, hidden tabs and offscreen', async ({ page }) => {
  await strip(page)
  const view = page.locator('.material-viewport')
  let before = await offset(page)
  await page.clock.runFor(1000)
  expect(await offset(page) - before).toBeGreaterThan(19)
  expect(await offset(page) - before).toBeLessThan(25)
  await view.hover()
  before = await offset(page)
  await page.clock.runFor(1500)
  expect(await offset(page)).toBe(before)
  await page.mouse.move(1, 1)
  await page.locator('[data-canonical=true] a').first().focus()
  before = await offset(page)
  await page.clock.runFor(1000)
  expect(await offset(page)).toBe(before)
  await page.getByRole('button', { name: 'Pause moving material' }).click()
  before = await offset(page)
  await page.clock.runFor(1000)
  expect(await offset(page)).toBeCloseTo(before, 0)
  await page.getByRole('button', { name: 'Resume moving material' }).click()
  await page.mouse.move(1, 1)
  await page.clock.runFor(100)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  before = await offset(page)
  await page.clock.runFor(1000)
  expect(await offset(page)).toBe(before)
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.clock.runFor(160)
  await expect(view).toHaveAttribute('data-running', 'false')
  before = await offset(page)
  await page.clock.runFor(1000)
  expect(await offset(page)).toBe(before)
  await view.scrollIntoViewIfNeeded()
  await page.clock.runFor(1000)
  expect(await offset(page)).toBeGreaterThan(before)
})

test('wrapping preserves visual positions, and a mouse drag never activates a record link', async ({ page }) => {
  await strip(page)
  const view = page.locator('.material-viewport')
  await view.hover()
  const width = await page.locator('.material-group').first().evaluate(node => node.getBoundingClientRect().width)
  await view.evaluate((node, width) => { node.scrollLeft = width * 2 - 4 }, width)
  await page.clock.runFor(20)
  await page.mouse.move(1, 1)
  await page.clock.runFor(500)
  expect(await offset(page)).toBeGreaterThan(width)
  expect(await offset(page)).toBeLessThan(width + 15)
  const box = (await view.boundingBox())!
  await page.mouse.move(box.x + 180, box.y + 80)
  const before = await offset(page)
  await page.mouse.down()
  await page.mouse.move(box.x + 60, box.y + 80, { steps: 8 })
  await page.mouse.up()
  expect(await offset(page)).toBeGreaterThan(before + 100)
  await expect(page).toHaveURL(/\/$/)
  await page.clock.runFor(1000)
  await expect(page).toHaveURL(/\/$/)
})

test('resizing keeps enough repeating material to fill wide windows without duplicate keyboard links', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Pause moving material' }).click()
  for (const width of [4600, 320, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const groupWidth = await page.locator('.material-group').first().evaluate(node => node.getBoundingClientRect().width)
    await expect(page.locator('.material-group')).toHaveCount(Math.max(3, Math.ceil(width / groupWidth) + 2))
    await expect(page.locator('.material-strip a[tabindex="0"]')).toHaveCount(6)
    await expect(page.getByRole('button', { name: 'Resume moving material' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test('keyboard reaches six unique records and deep links focus the matching Ivan material', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const first = page.locator('[data-canonical=true] a').first()
  await first.focus()
  await page.keyboard.press('End')
  await expect(page.locator('[data-canonical=true] a').last()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/ivan\?item=acmc-chronicle$/)
  await expect(page.locator('#record-acmc-chronicle')).toBeFocused()
  await page.locator('#record-acmc-chronicle a').click()
  await expect(page).toHaveURL(/\/ivan\/acmc-chronicle$/)
  await page.locator('.ivan-reader .back-link').click()
  await expect(page.locator('#record-acmc-chronicle')).toBeFocused()
})

test('preview clip is muted, visible-only, and honors persistent pause', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  const video = page.locator('[data-canonical=true] video')
  await video.scrollIntoViewIfNeeded()
  await expect(video).toHaveJSProperty('muted', true)
  await expect(video).toHaveJSProperty('paused', false)
  await page.getByRole('button', { name: 'Pause moving material' }).click()
  await expect(video).toHaveJSProperty('paused', true)
  await page.getByRole('button', { name: 'Resume moving material' }).click()
  await expect(video).toHaveJSProperty('paused', false)
  await page.locator('#argus').scrollIntoViewIfNeeded()
  await expect(video).toHaveJSProperty('paused', true)
})

test('failed preview clip retains its real poster; Ivan video is user-initiated with recovery', async ({ page }) => {
  await page.route('**/alumni-video.*.mp4*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('/')
  await page.locator('[data-canonical=true] video').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-canonical=true] .material-clip img')).toBeVisible()
  await page.goto('/ivan?item=alumni-video')
  const video = page.locator('.ivan-local-video')
  await expect(video).not.toHaveAttribute('src')
  await page.getByRole('button', { name: 'Play Ivan’s Principia alumni video' }).click()
  await expect(page.getByText('The clip could not load.')).toBeVisible()
  await page.unroute('**/alumni-video.*.mp4*')
  await page.getByRole('button', { name: 'Retry video' }).click()
  await expect(video).toHaveJSProperty('paused', false)
  await expect(video).toHaveJSProperty('muted', false)
  await expect(page.getByRole('link', { name: 'OPEN ORIGINAL POST' })).toHaveAttribute('href', /7495164888697298944-SLKL/)
})

test('document reader loads one page, exposes source text, supports zoom, navigation and original PDFs', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/ivan/engineering-newsletter')
  const image = page.locator('.ivan-document-page')
  await expect(image).toHaveAttribute('src', /engineering-newsletter\/page-2.webp$/)
  await expect(image).toHaveJSProperty('naturalWidth', 1600)
  await expect(page.getByLabel('Text of PDF page 2')).toContainText('INTERNSHIP SPOTLIGHT')
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  expect(requests.filter(url => /\.pdf$|page-1.webp/.test(url))).toEqual([])
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.locator('.ivan-document-viewport')).toHaveAttribute('data-zoom', '1.5')
  await page.getByRole('button', { name: 'FIT WIDTH' }).click()
  await expect(page.locator('.ivan-document-viewport')).toHaveAttribute('data-zoom', '1')
  await page.getByRole('button', { name: 'Previous page' }).click()
  await expect(image).toHaveAttribute('src', /page-1.webp$/)
  await expect(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  await expect(page.getByRole('link', { name: 'OPEN PDF' })).toHaveAttribute('href', '/__media/editorial/publications/engineering-newsletter.a1b239068faeba9f006362358d325de584a3f01e8c4db89459145f5a846d6bfd.pdf')
  await page.goto('/ivan/acmc-chronicle?page=12')
  await expect(image).toHaveAttribute('src', /page-12.webp$/)
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
  await page.goto('/ivan/acmc-chronicle?page=bad')
  await expect(image).toHaveAttribute('src', /page-1.webp$/)
})

test('document failures can retry; the native profile preserves every supplied paragraph', async ({ page }) => {
  await page.route('**/engineering-newsletter/page-2.webp*', route => route.fulfill({ status: 503, body: 'Unavailable' }))
  await page.goto('/ivan/engineering-newsletter')
  await expect(page.getByRole('button', { name: 'Retry page' })).toBeVisible()
  await page.unroute('**/engineering-newsletter/page-2.webp*')
  await page.getByRole('button', { name: 'Retry page' }).click()
  await expect(page.locator('.ivan-document-page')).toHaveJSProperty('naturalWidth', 1600)
  await page.goto('/ivan/leadership-profile')
  const paragraphs = readFileSync('src/data/editorial/leadership-profile.txt', 'utf8').trim().split(/\n\s*\n/)
  expect(paragraphs).toHaveLength(17)
  await expect(page.locator('.ivan-profile-body p')).toHaveCount(17)
  expect(await page.locator('.ivan-profile-body p').allTextContents()).toEqual(paragraphs)
  await expect(page.locator('.ivan-profile-body')).toContainText('Ivan Vashneckno')
  await expect(page.locator('.ivan-reader time')).toHaveCount(0)
  await expect(page).toHaveTitle('Ivan Vashchenko')
})

test('editorial compositions and reading pages fit desktop, tablet and narrow mobile', async ({ page }, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const route of ['/', '/ivan', '/ivan/engineering-newsletter', '/ivan/leadership-profile']) {
      await page.goto(route)
      const ready = route === '/' ? '.material-strip' : route === '/ivan' ? '.ivan-composition' : '.ivan-reader h1'
      await expect(page.locator(ready)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}/${route}`).toBeLessThanOrEqual(width)
      if (route === '/ivan') {
        for (const record of await page.locator('.ivan-record').all()) await record.scrollIntoViewIfNeeded()
        await expect(page.locator('.ivan-spread img').last()).toHaveJSProperty('naturalWidth', 800)
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      }
      if (route === '/') await page.locator('.hero').screenshot({ path: info.outputPath(`home-${width}.png`) })
      else await page.screenshot({ path: info.outputPath(`${route.replaceAll('/', '_')}-${width}.png`), fullPage: true })
    }
  }
})

test.describe('touch strip', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('horizontal touch drag works while vertical gestures scroll the page', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const view = page.locator('.material-viewport')
    await view.scrollIntoViewIfNeeded()
    const box = (await view.boundingBox())!
    const cdp = await context.newCDPSession(page)
    const swipe = async (x: number, y: number, dx: number, dy: number) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const before = await offset(page)
    await swipe(300, box.y + 80, -180, 0)
    await expect.poll(() => offset(page)).toBeGreaterThan(before + 70)
    const scroll = await page.evaluate(() => scrollY)
    await swipe(180, box.y + 130, 0, -110)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll + 30)
    await expect(page).toHaveURL(/\/$/)
  })
})
