import { expect, test } from '@playwright/test'
import { projects } from '../../src/data/projects/index'

const linkedin = 'https://www.linkedin.com/in/ivan-vashchenko'
const email = 'mailto:ivanvashchenko1756@gmail.com'
const phone = 'tel:+17272367217'
const headline = 'Engineering Automation | Mechanical Engineering + Computer Science | WTI Pure Air | ACMC Founder | Technical Strategy & AI Systems'

test('navigation replaces Leadership with Contact and the legacy route redirects with replacement', async ({ page }) => {
  await page.goto('/')
  const primary = page.getByRole('navigation', { name: 'Explore disciplines' })
  await expect(primary.getByRole('link')).toHaveText(['AI', 'ME', 'Contact'])
  await expect(primary.getByRole('link', { name: /Leadership/i })).toHaveCount(0)
  await primary.getByRole('link', { name: 'Contact', exact: false }).click()
  await expect(page).toHaveURL(/\/contact$/)
  await expect(page.locator('.site-header a.active')).toHaveText(/Contact/i)
  await page.goto('/leadership')
  await expect(page).toHaveURL(/\/contact$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('CONTACT.')
})

test('Contact uses the authentic LinkedIn presentation and exact functional directory', async ({ page }) => {
  await page.goto('/contact')
  await expect(page).toHaveTitle('Contact | Ivan Vashchenko')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Contact Ivan Vashchenko via LinkedIn, email, or phone.')
  const card = page.getByRole('link', { name: 'View Ivan Vashchenko on LinkedIn' })
  await expect(card).toHaveAttribute('href', linkedin)
  await expect(card).toHaveAttribute('target', '_blank')
  await expect(card).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(card).toContainText('Ivan Vashchenko')
  await expect(card).toContainText(headline)
  await expect(card).toContainText('WTI - Pure Air Control Services')
  await expect(card).toContainText('Principia College')
  await expect(card).toContainText('linkedin.com/in/ivan-vashchenko')
  await expect(card.locator('.linkedin-banner')).toHaveJSProperty('naturalWidth', 1920)
  await expect(card.locator('.linkedin-photo')).toHaveJSProperty('naturalWidth', 1200)
  await expect(card.locator('iframe')).toHaveCount(0)

  const directory = page.locator('.contact-directory')
  const links = directory.getByRole('link')
  await expect(links).toHaveCount(2)
  await expect(links.nth(0)).toHaveAttribute('href', email)
  await expect(links.nth(1)).toHaveAttribute('href', phone)
  await expect(page.locator('a[href*="github.com"]')).toHaveCount(0)
})

test('one functional footer appears across the site with no temporary copy', async ({ page }) => {
  test.setTimeout(120000)
  const routes = ['/', '/ai', '/me', '/contact', '/ivan', ...projects.map(project => project.route)]
  for (const route of routes) {
    await page.goto(route)
    const footer = page.locator('footer')
    await expect(footer).toHaveCount(1)
    await expect(footer.getByRole('link')).toHaveText(['IVAN VASHCHENKO', 'LINKEDIN ↗', 'EMAIL ↗', 'CONTACT →'])
    await expect(footer.getByRole('link', { name: 'LINKEDIN ↗' })).toHaveAttribute('href', linkedin)
    await expect(footer.getByRole('link', { name: 'LINKEDIN ↗' })).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(footer.getByRole('link', { name: 'EMAIL ↗' })).toHaveAttribute('href', email)
    await expect(footer.getByRole('link', { name: 'CONTACT →' })).toHaveAttribute('href', '/contact')
    await expect(page.getByText('AN ONGOING EXPLORATION.', { exact: true })).toHaveCount(0)
    await expect(page.getByText('LINKS COMING SOON', { exact: true })).toHaveCount(0)
    await expect(page.locator('a[href*="github.com"]')).toHaveCount(0)
    expect(await footer.locator('a').evaluateAll(anchors => anchors.every(anchor => Boolean(anchor.getAttribute('href')) && anchor.getAttribute('href') !== '#'))).toBe(true)
  }
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`Contact and footer fit ${viewport.width}×${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('/contact')
    await expect(page.locator('.linkedin-card')).toBeVisible()
    await expect(page.locator('.linkedin-headline')).toHaveText(headline)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    const emailLink = page.getByRole('link', { name: /Email: ivanvashchenko1756@gmail.com/ })
    const emailBox = await emailLink.boundingBox()
    expect(emailBox).not.toBeNull()
    expect(emailBox!.width).toBeLessThanOrEqual(viewport.width)
    await page.screenshot({ path: info.outputPath(`contact-${viewport.width}x${viewport.height}.png`), fullPage: true })
    await page.locator('footer').screenshot({ path: info.outputPath(`footer-${viewport.width}x${viewport.height}.png`) })
  })
}
