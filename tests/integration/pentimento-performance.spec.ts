import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

test('conference preview cold/warm local timing and real still @real-media', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width:1440,height:1000 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'connection',{ configurable:true,value:{ saveData:true,effectiveType:'4g' } })
    const metrics = { posterVisibleMs:0, firstVideoFrameMs:0, waitsAfterPlaying:0, started:false }
    Object.assign(window,{ previewMetrics:metrics })
    const observer = new MutationObserver(() => {
      const video = document.querySelector<HTMLVideoElement>('.pentimento-video')
      if (!video) return
      observer.disconnect()
      const visible = new IntersectionObserver(async ([entry]) => {
        if (!entry.isIntersecting) return
        visible.disconnect()
        const image = new Image(); image.src = video.poster; await image.decode()
        requestAnimationFrame(() => { metrics.posterVisibleMs = performance.now() })
      })
      visible.observe(video)
    })
    observer.observe(document,{subtree:true,childList:true})
    document.addEventListener('playing',event => {
      const video = event.target as HTMLVideoElement
      if (!video.classList.contains('pentimento-video')) return
      metrics.started=true
      video.requestVideoFrameCallback(() => { metrics.firstVideoFrameMs ||= performance.now() })
    },true)
    document.addEventListener('waiting', () => { if(metrics.started)metrics.waitsAfterPlaying++ },true)
  })
  const results=[]
  let requests=0
  page.on('request',r => { if(r.url().includes('Textured_mesh_1_binary-repacked.')) requests++ })
  for (const cache of ['cold','warm']) {
    await page.goto('/projects/pentimento')
    const video=page.locator('.pentimento-video')
    await video.scrollIntoViewIfNeeded()
    await expect.poll(() => page.evaluate(() => (window as any).previewMetrics.posterVisibleMs)).toBeGreaterThan(0)
    const posterMs = await page.evaluate(() => (window as any).previewMetrics.posterVisibleMs)
    await expect.poll(() => page.evaluate(() => (window as any).previewMetrics.firstVideoFrameMs),{timeout:15000}).toBeGreaterThan(0)
    await page.waitForTimeout(1500)
    const videoMetrics=await page.evaluate(() => (window as any).previewMetrics)
    const start=await page.evaluate(() => performance.now())
    await page.getByRole('tab',{name:'FINAL MODEL'}).click()
    const still=page.locator('.pentimento-model-still')
    await expect(still).toBeVisible()
    await expect(page.locator('.pentimento-panel[data-active=true]')).toHaveCSS('opacity','1')
    const stillMs=await still.evaluate(async (element:HTMLImageElement) => { await element.decode(); return performance.now() })-start
    await page.locator('.pentimento-experience').screenshot({path:test.info().outputPath(`${cache}-still.png`)})
    await expect(page.locator('.object-canvas')).toHaveAttribute('data-model-state','ready',{timeout:90000})
    await page.waitForTimeout(500)
    await page.locator('.pentimento-experience').screenshot({path:test.info().outputPath(`${cache}-interactive.png`)})
    const measurements=await page.evaluate(() => performance.getEntriesByType('measure').filter(e=>e.name.startsWith('pentimento:')).map(e=>({name:e.name,ms:e.duration})))
    results.push({cache,posterMs,stillMs,videoMetrics,measurements,requests})
    if(cache==='cold') await expect.poll(()=>page.evaluate(async()=> (await(await caches.open('pentimento-assets-v1')).keys()).length)).toBeGreaterThan(0)
  }
  expect(requests).toBe(1)
  await mkdir('.cache/pentimento-performance',{recursive:true})
  await writeFile('.cache/pentimento-performance/browser-measurements.json',JSON.stringify(results,null,2)+'\n')
})
