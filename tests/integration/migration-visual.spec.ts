import { test, expect } from '@playwright/test'

test('migration review captures Home, editorial composition, readers and category/project layouts', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}))
  for (const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000})
    for (const route of ['/','/ivan','/ivan/engineering-newsletter','/ivan/acmc-chronicle','/ai','/me','/projects/geoarbiter']) {
      await page.goto(route)
      await expect(page.getByRole('heading', {level:1})).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      if (route.startsWith('/ivan/')) {
        await expect(page.locator('.ivan-document-page')).toBeVisible()
        await expect(page.locator('.ivan-document-page')).toHaveJSProperty('naturalWidth',1600)
      }
      if (route === '/ivan') {
        for (const record of await page.locator('.ivan-record').all()) await record.scrollIntoViewIfNeeded()
      }
      await page.evaluate(() => window.scrollTo(0,0))
      await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('img')].filter(image=>{ const rect=image.getBoundingClientRect(); return rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0 && rect.width > 0 }).every(image=>image.complete))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.screenshot({path:test.info().outputPath(`${route.replaceAll('/','_')}-${width}.png`),fullPage:route!=='/'})
    }
  }
})
