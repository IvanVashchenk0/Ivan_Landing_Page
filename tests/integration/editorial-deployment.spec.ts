import { expect, test } from '@playwright/test'

test('editorial navigation and local media respect the configured base and router', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const root = baseURL!
  const prefix = new URL(root).pathname.replace(/\/$/, '')
  const hashMode = process.env.TEST_HASH_ROUTING === '1'
  await page.goto(root)
  await page.locator('[data-canonical=true] [data-record="engineering-newsletter"] a').click()
  if (hashMode) await expect(page).toHaveURL(new RegExp(`${prefix}/#/ivan\\?item=engineering-newsletter$`))
  else await expect(page).toHaveURL(new RegExp(`${prefix}/ivan\\?item=engineering-newsletter$`))
  await expect(page.locator('#record-engineering-newsletter')).toBeFocused()
  await page.locator('#record-engineering-newsletter a').click()
  const image = page.locator('.ivan-document-page')
  await expect(image).toHaveAttribute('src', `${prefix}/media/editorial/engineering-newsletter/page-2.webp`)
  await expect(image).toHaveJSProperty('naturalWidth', 1600)
  await expect(page.getByRole('link', { name: 'OPEN PDF' })).toHaveAttribute('href', `${prefix}/__media/editorial/publications/engineering-newsletter.a1b239068faeba9f006362358d325de584a3f01e8c4db89459145f5a846d6bfd.pdf`)
  await page.locator('.ivan-reader .back-link').click()
  await expect(page.locator('#record-engineering-newsletter')).toBeFocused()
  await page.goBack()
  await expect(image).toBeVisible()
})
