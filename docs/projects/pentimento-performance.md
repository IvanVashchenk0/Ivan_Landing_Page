# Pentimento: conference preview delivery

The experience presents real imagery before an interactive model is ready. No geometry, texture, material, transform, or hierarchy has been changed. Desktop retains the complete full-resolution model. The experimental mobile path uses the separately exported 1024-texture derivative only after explicit FINAL MODEL selection.

## Assets and encoding

| Asset | Previous delivery | New delivery |
| --- | ---: | ---: |
| Interactive GLB | 233,840,976 bytes / 223.01 MiB | 189,842,544 bytes / 181.05 MiB |
| Input video | 129,260,636 bytes / 123.27 MiB | 19,756,992 bytes / 18.84 MiB |
| Input poster | None | 47,680 bytes / 46.56 KiB |
| Reconstruction still | None | 52,476 bytes / 51.25 KiB |
| Mobile interactive GLB | None | 30,697,560 bytes / 29.28 MiB |

Desktop selects `pentimento.model-binary-repacked`; the original `pentimento.model` remains registered. Mobile selects the separate `pentimento.model-mobile`. The new video ID is `pentimento.input-video-web`; MOV and previous MP4 remain registered and untouched.

Video encoding: FFmpeg 7.1, `setpts=(PTS-STARTPTS)/5,fps=30`, libx264, slow preset, CRF 23, High profile / level 4.1, yuv420p, 1920×1080, no audio, maximum GOP 60 frames (2 seconds), minimum keyframe interval 30, `+faststart`. Duration is 19.50 seconds including frame rounding. The site plays it at 1×. No portions were cut or reordered. A higher-bitrate first encode was reviewed but not selected for delivery.

The MP4 `moov` starts at byte 32, before `mdat`; the browser can begin playback without downloading the entire clip. The poster is a real frame at 2 seconds of accelerated time, resized to 1280×720 and encoded as WebP quality 88. The model still is a 1000×700 real render of the verified repacked GLB, WebP quality 92. Its source PNG was pixel-identical to the original GLB in the Stage A comparison. The model's own JPEGs are untouched.

Frames at accelerated times 2, 8, and 15 seconds were compared visually with the retimed original. Full-sequence SSIM against the identically retimed/frame-sampled original was 0.986480. This lossy **video derivative** is separate from the lossless GLB preservation guarantee.

## Loading behavior

- Far from Pentimento: no video or GLB download. Existing near-viewport JavaScript preloading remains on desktop.
- On phones, tablets, and touch-capable devices, viewport visibility, dwell, hover, focus, and pointer activity do not import the viewer, initialize WebGL, or request a GLB. Explicit FINAL MODEL selection displays the genuine still, imports the viewer, and requests only `pentimento.model-mobile`. The desktop GLB is rejected by the loader on mobile.
- The mobile renderer caps device pixel ratio at 1.25, disables antialiasing and shadows, dedicates touch gestures to one-finger orbit and two-finger pinch zoom, and renders only while interaction or settling requires it. The prepared scene remains mounted while switching between INPUT VIDEO and FINAL MODEL.
- On approach: lightweight input/model images warm with the interface. Visible input video starts muted and inline; reduced motion keeps its poster until Play is selected.
- Automatic GLB prefetch requires 30% exhibit visibility, an active visible tab, permitted network settings, actual video playback without a stall, 1.5 seconds of stable playback, and at least 5 seconds buffered ahead (or the whole clip buffered). Save-Data, 2G/3G, reported downlink below 8 Mbps, or RTT above 300 ms suppress automatic prefetch. Where connection information is unavailable, observed video buffering gates it.
- On desktop, hover, focus, pointer intent, or selection of FINAL MODEL bypasses automatic network restrictions. The active fetch is reused; no duplicate request or discarded partial GLB is introduced. A new explicit request uses high fetch priority; automatic requests use low priority where supported.
- Selection immediately mounts the real still and genuine byte progress. The existing tab transition remains; a separate 400 ms still-to-canvas crossfade starts only after parsing, scene setup, shader compilation and an initial render. Reduced motion disables transitions.
- Incomplete video downloads are released on model selection by detaching the source and calling `load()`, retaining the playback position for a clean return. Fully buffered video is kept attached. This avoids assuming `pause()` cancels network traffic; partially buffered browser media may be discarded on detach, with normal HTTP caching still available.
- Switching tabs keeps the prepared scene. Route departure disposes the GPU resources; returning shows the still and reparses session/Cache Storage bytes.
- Desktop retains its short-lived WebGL2/8192px preflight. Mobile creates only its actual renderer after selection and checks that context for the derivative's 1024px textures. `MAX_TEXTURE_SIZE` is not treated as evidence of sufficient device memory. No WebGL, context loss, or preparation failure leaves the genuine still with an accessible explanation.

The viewer and still share a contained 10:7 camera viewport, initial orientation, lights, and color settings. The exterior exhibit dimensions and controls remain unchanged. Controls remain disabled until interactive readiness; the still is explicitly described as noninteractive.

## Verification and measurements

Browser test artifacts and raw timing records are in ignored `.cache/pentimento-performance/` and `test-results-media/`. Measurements use Chrome 154 on this macOS machine, a localhost Vite server, the real 181 MiB GLB and 18.84 MiB video, and one cold visit followed by a same-context warm visit. Save-Data was enabled in the timing test to keep model transfer deferred until explicit selection. This is not a production-network benchmark or a physical iPhone test.

| Measured stage | Cold | Warm |
| --- | ---: | ---: |
| Input poster visible | 0.719 s | 0.777 s |
| First input-video frame | 0.869 s | 0.845 s |
| Model still fully visible after click | 1.097 s | 1.015 s |
| GLB network transfer | 0.254 s | Cached; no request |
| GLB parse | 1.082 s | 0.462 s |
| Scene preparation | 0.001 s | 0.000 s |
| Shader/texture preparation | 4.102 s | 3.333 s |
| First rendered frame after shader preparation | 0.001 s | 0.001 s |
| Click to interactive readiness | 5.701 s | 4.888 s |

No video rebuffering events were observed after playback began during these short observations. There was one GLB network request across both visits. The still timing includes the existing input/model tab transition; it is not just an image decode measurement.

 Individual results are observations, not performance guarantees. `compileAsync` includes texture/shader preparation; the first-frame measure begins after it completes. The full model still needs several seconds even when its bytes are cached; the lightweight still is the immediate result.

## Original integrity

Before and after SHA-256 values are identical for all four protected binaries:

| Protected asset | SHA-256, before = after |
| --- | --- |
| Original GLB | `45b568bac1c1246dd703e9827742b1d0102c4e0ffdb2535046d80ed1822026c0` |
| Binary-repacked GLB | `c5d5debee4de333d8a31e1a1c931eb1313b7964f5020475f615edd5e8f24f281` |
| Original MOV | `70a94bc33da656976e08ca0f26a97b9f678ef745d37e7e409e99f0bd421d0aeb` |
| Previous MP4 | `e1d1738e92a6be745fe4bbc43f9644069ba78ab0829c9507b8b962b895923d94` |

New video SHA-256: `4f9f568c497f204ff79fec7644d43c56fcf9539df6ca4d8f1e4403587ec315b2`.

## Reproduction

No new runtime dependencies were added. Optional preparation needs FFmpeg and Pillow. The one-time preparation command refuses to overwrite an existing video derivative:

```sh
npm run media:prepare-pentimento -- --ffmpeg /path/to/ffmpeg --model-frame .cache/pentimento-repack/repacked-primary.png
```

The real-model capture can be regenerated with the Stage A real-media comparison test. Prepared posters are committed lightweight assets; production builds do not run FFmpeg, Pillow, or read heavy source files.

## Deployment handoff — only after approval

The new GLB and video **must be uploaded and publicly verified before publishing the code that selects them**. Public object URLs are derived from the manifest, never hardcoded into React. Prior versioned objects are retained.

1. Configure the existing R2 bucket, endpoint, profile and public domain using [the R2 guide](../r2-setup.md). Keep credentials out of Vite variables.
2. Verify the local artifacts and upload plan:

   ```sh
   npm run media:verify
   npm run media:check
   npm run media:sync -- --dry-run
   ```

3. After approval, check connectivity and upload:

   ```sh
   npm run media:connection
   npm run media:sync
   ```

   This existing command checks all manifest entries, skips matching objects, and uploads missing/versioned objects. It never deletes old versions. It is not restricted to the two Pentimento derivatives.

4. Verify the two new objects at the configured public media domain: successful HEAD with exact size/MIME; an actual Range GET returns 206 and the requested bytes; GLB CORS permits the website origin and exposes Content-Length/Content-Range/Content-Encoding. Follow [deployment response checks](../deployment.md). Do not proceed if either asset is missing or inaccessible.
5. Set `VITE_MEDIA_BASE_URL` to the verified public domain in Vercel and leave `VITE_USE_LOCAL_MEDIA` unset. Validate locally against that same public domain:

   ```sh
   VITE_MEDIA_BASE_URL=https://YOUR-VERIFIED-MEDIA-DOMAIN VITE_USE_LOCAL_MEDIA=false PLAYWRIGHT_CHANNEL=chrome npm run validate
   ```

6. Commit the reviewed changes only after upload verification; publish through the established GitHub → Vercel integration with `git push origin main`. Vercel runs `npm run build` and deploys `dist/`; it does not upload media. No new hosting workflow is needed.
7. On the deployed homepage and project page, verify both posters, the new video at 1×, only the repacked GLB request, actual progress, the first-frame transition, cached revisit, and input/model switching. Verify desktop and physical iPhone Safari. Live CDN latency, bandwidth, CORS, and iPhone Safari remain unverified until that step.

## Files changed for this performance task

- Source: `src/projects/pentimento/{index.tsx,InputVideo.tsx,ModelViewer.tsx,ModelLoading.tsx,ModelPoster.tsx,capabilities.ts,media.ts,modelLoader.ts,data.ts,styles.css,loading.css}`.
- Preparation: `scripts/media/prepare/prepare-pentimento.py`; `package.json` preparation command.
- Registries: `scripts/media/manifest.json`; `src/data/media/manifest.generated.json`.
- Heavy derivative (ignored): `media-source/projects/pentimento/sarah_checkin-web.mp4`.
- Lightweight assets: `public/media/projects/pentimento/{input-poster.webp,model-still.webp}`.
- Tests: `tests/integration/{pentimento-loading.spec.ts,pentimento-performance.spec.ts}`; `tests/e2e/{project-media.spec.ts,site.spec.ts,portfolio.spec.ts}`; `tests/integration/media-deployment.spec.ts` (new asset and reduced-motion expectations).
- Documentation: this report and the Pentimento project guide.

Earlier uncommitted R2 setup and Stage A repacker work were preserved. Argus, Monte Carlo, editorial/readers, navigation and category layouts were not edited.

## Final checks

- Portable regression coverage: 98 tests accounted for. The full run passed 96; two obsolete reduced-motion/asset-selection expectations were corrected and both passed on targeted rerun. The expanded four-width loading-state check also passed.
- Real-media verification passed for original GLB integrity, byte-range serving, full-resolution mobile touch/pinch, desktop orbit/zoom/reset and canvas reuse, and cold/warm delivery with no duplicate GLB transfer.
- Build/TypeScript, lint, media verification, media consistency and ignore checks, offline sync dry run, and diff whitespace checks passed. Vite retains its existing large Three.js chunk advisory.
- Reviewed loading-state screenshots at 1440, 768, 390 and 320px; real still/interactive screenshots at desktop; original/derived video contact sheet at 2, 8 and 15 seconds.
- Physical iPhone Safari and live R2/CDN/Vercel measurements were not performed. No live availability or conference-network guarantee is implied.
