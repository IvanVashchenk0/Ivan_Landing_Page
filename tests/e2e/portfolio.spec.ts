import { expect, test } from '@playwright/test'
import { featuredProjects, getProjectsByCategory, getProjectNeighbors, projects } from '../../src/data/projects/index'

const ai = ['argus', 'pentimento', 'geoarbiter', 'image-recognition', 'voice-cloning', 'monte-carlo', 'ecotrail', 'peggame-solver']
const me = ['autonomous-sorting', 'ahu-digitalization', 'thermal-home-modeling', 'quickscope', 'solar-car-linkage', 'digitally-manufactured-reactor', 'computational-chemistry', 'aerodynamics']

test('sixteen catalog entries preserve category order, homepage curation, and honest placeholders', () => {
  expect(projects).toHaveLength(16)
  expect(new Set(projects.map(project => project.id)).size).toBe(16)
  expect(new Set(projects.map(project => project.route)).size).toBe(16)
  expect(featuredProjects.map(project => project.id)).toEqual(['argus', 'pentimento', 'monte-carlo'])
  for (const [category, ids] of [['ai', ai], ['me', me]] as const) {
    const entries = getProjectsByCategory(category)
    expect(entries.map(project => project.id)).toEqual(ids)
    expect(entries.map(project => project.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      expect(entry.route).toBe(`/projects/${ids[i]}`)
      expect(getProjectNeighbors(entry)).toEqual({ previous: entries[i - 1], next: entries[i + 1] })
    }
  }
  const placeholders = projects.filter(project => project.previewType === 'placeholder')
  expect(placeholders).toHaveLength(13)
  for (const project of placeholders) {
    expect(project.details).toEqual([])
    expect(project.sections).toBeUndefined()
    expect(project.description).toBeUndefined()
    expect(project.previewMedia).toBeUndefined()
  }
})

test('category exhibits include a numbered section and explicit Explore Project link for every project', async ({ page }) => {
  for (const [category, ids] of [['ai', ai], ['me', me]] as const) {
    await page.goto(`/${category}`)
    const sections = page.locator('.project-section')
    expect(await sections.evaluateAll(elements => elements.map(element => element.id))).toEqual(ids)
    for (let i = 0; i < ids.length; i++) {
      const section = sections.nth(i)
      await expect(section.locator('.section-number')).toHaveText(String(i + 1).padStart(2, '0'))
      await expect(section.locator('.section-topline')).toContainText(`/ ${category.toUpperCase()}`)
      await expect(section.getByRole('link', { name: 'EXPLORE PROJECT', exact: true })).toHaveAttribute('href', `/projects/${ids[i]}`)
      await expect(section.locator('h2 a')).toHaveAttribute('href', `/projects/${ids[i]}`)
      if (!['argus', 'pentimento', 'monte-carlo'].includes(ids[i])) {
        await expect(section.getByText('PREVIEW IN DEVELOPMENT', { exact: true })).toBeVisible()
        expect((await section.locator('.portfolio-placeholder').boundingBox())!.height).toBeGreaterThanOrEqual(410)
        await section.locator('.portfolio-placeholder').click()
        await expect(page).toHaveURL(new RegExp(`/${category}$`))
      }
    }
    await sections.nth(2).getByRole('link', { name: 'EXPLORE PROJECT', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${ids[2]}$`))
    await page.getByRole('link', { name: `BACK TO ${category.toUpperCase()}` }).click()
    await expect(page).toHaveURL(new RegExp(`/${category}$`))
    await page.locator(`#${ids[3]} h2 a`).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${ids[3]}$`))
  }
})

test('all dedicated routes retain primary experiences or intentional case-study placeholders with exact neighbors', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Video placeholder for test</body></html>' }))
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const project of projects) {
    await page.goto(project.route)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title)
    await expect(page).toHaveTitle(`${project.title} — Ivan Vashchenko`)
    await expect(page.getByRole('link', { name: `BACK TO ${project.category.toUpperCase()}` })).toHaveAttribute('href', `/${project.category}`)
    const nav = page.getByRole('navigation', { name: 'Project navigation' })
    const { previous, next } = getProjectNeighbors(project)
    if (previous) await expect(nav.locator('a[rel="prev"]')).toHaveAttribute('href', previous.route)
    else await expect(nav.locator('a[rel="prev"]')).toHaveCount(0)
    if (next) await expect(nav.locator('a[rel="next"]')).toHaveAttribute('href', next.route)
    else await expect(nav.locator('a[rel="next"]')).toHaveCount(0)
    if (project.previewType === 'placeholder') {
      await expect(page.getByText('PROJECT CASE STUDY IN DEVELOPMENT', { exact: true })).toBeVisible()
      await expect(page.getByText('Additional project material will be added here.', { exact: true })).toBeVisible()
      await expect(page.locator('.project-details, .portfolio-case-study section')).toHaveCount(0)
      await expect(page.locator('.project-detail img, .project-detail video, .project-detail canvas')).toHaveCount(0)
    }
  }
  await page.goto('/projects/geoarbiter')
  await page.locator('a[rel="prev"]').click()
  await expect(page).toHaveURL(/\/projects\/pentimento$/)
  await page.locator('a[rel="next"]').click()
  await expect(page).toHaveURL(/\/projects\/geoarbiter$/)
  await page.locator('a[rel="next"]').click()
  await expect(page).toHaveURL(/\/projects\/image-recognition$/)
  expect(errors).toEqual([])
})

test('homepage retains the three featured experiences with minimal project wrappers', async ({ page }) => {
  await page.goto('/')
  expect(await page.locator('.project-section').evaluateAll(elements => elements.map(element => element.id))).toEqual(['argus', 'pentimento', 'monte-carlo'])
  await expect(page.locator('.portfolio-placeholder')).toHaveCount(0)
  await expect(page.locator('.home-project .section-topline')).toHaveCount(0)
  await expect(page.locator('.home-project .project-heading p')).toHaveCount(0)
  await expect(page.locator('.home-project .interaction-note')).toHaveCount(0)
  await expect(page.locator('.section-bottomline').getByRole('link', { name: 'EXPLORE PROJECT', exact: true })).toHaveCount(3)
})

test('locked previews remain interactive on AI without navigating from their controls', async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/ai')
  const argus = page.locator('#argus')
  await argus.scrollIntoViewIfNeeded()
  await argus.getByRole('button', { name: 'Skip animation' }).click()
  await expect(argus.getByRole('img', { name: 'ARGUS — Guarding every payment' })).toBeVisible()
  await expect(page).toHaveURL(/\/ai$/)
  const pentimento = page.locator('#pentimento')
  await pentimento.scrollIntoViewIfNeeded()
  await pentimento.getByRole('button', { name: 'Play input video' }).click()
  await pentimento.getByRole('button', { name: 'Pause input video' }).click()
  await expect(pentimento.locator('video')).toHaveJSProperty('paused', true)
  await pentimento.getByRole('tab', { name: 'FINAL MODEL' }).click()
  const viewer = pentimento.getByRole('group', { name: /Interactive Pentimento reconstruction/ })
  await expect(viewer).toHaveAttribute('data-model-state', 'ready', { timeout: 90000 })
  const canvas = viewer.locator('canvas')
  const before = await canvas.screenshot()
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .55, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => canvas.screenshot()).not.toEqual(before)
  await expect(page).toHaveURL(/\/ai$/)
  const monte = page.locator('#monte-carlo')
  await monte.scrollIntoViewIfNeeded()
  await monte.getByRole('button', { name: 'Skip animation' }).click()
  await expect(monte.locator('.future-film')).toHaveAttribute('data-complete', 'true')
  await monte.getByRole('button', { name: 'Replay' }).click()
  await expect(monte.locator('.future-film')).toHaveAttribute('data-scene', 'SETUP')
  await expect(page).toHaveURL(/\/ai$/)
  await monte.getByRole('link', { name: 'EXPLORE PROJECT', exact: true }).click()
  await page.getByRole('button', { name: 'Run 10,000 futures' }).click()
  await expect(page.locator('.futures-density')).toHaveCount(3)
  await expect(page).toHaveURL(/\/projects\/monte-carlo$/)
})

test('substantial placeholders, long titles and project navigation fit desktop and mobile', async ({ page }, info) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const category of ['ai', 'me']) {
      await page.goto(`/${category}`)
      for (const section of await page.locator('.portfolio-new-project').all()) {
        await section.scrollIntoViewIfNeeded()
        const box = (await section.locator('.portfolio-placeholder').boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(410)
        expect(box.width).toBeGreaterThanOrEqual(width <= 390 ? width - 60 : Math.min(1100, width * .85))
        const overflow = await section.evaluate(element => Array.from(element.querySelectorAll<HTMLElement>('.project-heading, h2, .portfolio-placeholder, .section-bottomline')).filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.className || node.tagName))
        expect(overflow).toEqual([])
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      const example = category === 'ai' ? 'image-recognition' : 'computational-chemistry'
      await page.locator(`#${example}`).screenshot({ path: info.outputPath(`${category}-${width}-preview.png`) })
      await page.goto(`/projects/${example}`)
      await expect(page.getByText('PROJECT CASE STUDY IN DEVELOPMENT', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.locator('.project-detail').screenshot({ path: info.outputPath(`${category}-${width}-page.png`) })
      await page.getByRole('navigation', { name: 'Project navigation' }).screenshot({ path: info.outputPath(`${category}-${width}-navigation.png`) })
    }
  }
})
