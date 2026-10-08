import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import manifest from '../../src/data/media/manifest.generated.json' with { type: 'json' }

test('base-path browser/hash navigation and CDN-first development use the same media contracts', async ({ browser }) => {
  test.setTimeout(60000)
  for (const mode of ['browser', 'hash']) {
    const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5199', '--strictPort'], { env: { ...process.env, VITE_BASE_PATH: '/portfolio/', VITE_ROUTER_MODE: mode, VITE_MEDIA_BASE_URL: 'https://cdn.test.invalid/assets', VITE_USE_LOCAL_MEDIA: 'false' }, stdio: 'pipe' })
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    try {
      await expect.poll(async () => { try { return (await fetch('http://127.0.0.1:5199/portfolio/')).status } catch { return 0 } }).toBe(200)
      const page = await context.newPage()
      await page.route('https://cdn.test.invalid/**', route => route.fulfill({ status: 200, contentType: 'video/mp4', path: 'tests/fixtures/media/video.mp4' }))
      const root = 'http://127.0.0.1:5199/portfolio/'
      await page.goto(root)
      await page.locator('[data-canonical=true] [data-record="engineering-newsletter"] a').click()
      expect(page.url()).toBe(root + (mode === 'hash' ? '#/' : '') + 'ivan?item=engineering-newsletter')
      await expect(page.locator('#record-engineering-newsletter')).toBeFocused()
      await page.locator('#record-engineering-newsletter a').click()
      await expect(page.locator('.ivan-document-page')).toHaveAttribute('src','/portfolio/media/editorial/engineering-newsletter/page-2.webp')
      await expect(page.getByRole('link',{name:'OPEN PDF'})).toHaveAttribute('href','https://cdn.test.invalid/assets/' + manifest['editorial.engineering-newsletter'].remotePath)
      await page.goBack()
      await expect(page.locator('#record-engineering-newsletter')).toBeFocused()
      const project = root + (mode === 'hash' ? '#/' : '') + 'projects/pentimento'
      await page.addInitScript(() => Object.defineProperty(navigator, 'connection', {value:{saveData:true},configurable:true}))
      await page.goto(project)
      await expect(page.locator('.pentimento-video')).toHaveAttribute('poster','/portfolio/media/projects/pentimento/input-poster.webp')
      await page.getByRole('button',{name:'Play input video'}).click()
      await expect(page.locator('.pentimento-video')).toHaveAttribute('src','https://cdn.test.invalid/assets/' + manifest['pentimento.input-video-web'].remotePath)
      await expect(page.locator('.pentimento-video')).toHaveJSProperty('paused',false)
      const localEndpoint = await context.request.get(root + '__media/' + manifest['pentimento.model'].remotePath)
      expect(localEndpoint.headers()['content-type']).not.toBe('model/gltf-binary')
    } finally {
      await context.close()
      server.kill('SIGTERM')
      await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()) })
    }
  }
})
