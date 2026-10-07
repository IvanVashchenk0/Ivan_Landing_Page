# Deployment preparation

This refactor does not create buckets, upload files, publish a site, initialize Git, commit, or push. Live provider checks remain pending until storage is configured.

1. Configure an existing R2/S3 bucket and public media domain separately.
2. Set upload-only configuration described in [media workflow](media-workflow.md), then explicitly synchronize when ready.
3. Set `VITE_MEDIA_BASE_URL=https://media.example.com` in application build settings. Do not set `VITE_USE_LOCAL_MEDIA=true` in production.
4. Build and validate. Media URLs are content-addressed, so keep earlier object versions for existing builds and browser caches.

For Vercel use `npm run build` and `dist/` (already configured in vercel.json). Vercel builds only the application; it does not synchronize or prepare originals. Existing SPA rewrites remain. The obsolete local GLB response rule has been removed because the CDN now serves it.

For GitHub Pages:

```sh
VITE_MEDIA_BASE_URL=https://media.example.com VITE_BASE_PATH=/REPOSITORY/ VITE_ROUTER_MODE=hash npm run build
```

Deploy only `dist/`. BrowserRouter remains the default; the existing hash-router option keeps query-targeted editorial links and project routes working under repository bases.

## Public media responses

Use a public custom domain for R2 production delivery. Keep the upload API endpoint distinct from this domain. Apply CORS for the actual website origins and development origin if desired, following [R2 CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/). Example bucket policy (replace domains):

```json
[
  {
    "AllowedOrigins": ["https://www.example.com", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Content-Encoding", "Accept-Ranges", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Serve GLB as model/gltf-binary, PDF as application/pdf, browser MP4 as video/mp4. The synchronization manifest sets these explicitly. Keep binary payloads unchanged and avoid transparent GLB compression. The loader uses Content-Length and Content-Encoding to decide whether percentages are trustworthy; otherwise it reports received bytes. Expose those headers across origins.

Verify the live URL with HEAD and an actual `Range: bytes=0-11` GET. Expect the exact total Content-Length on HEAD, HTTP 206 on the range request, Content-Range `bytes 0-11/<full size>`, and exactly 12 original bytes. An Accept-Ranges header alone is insufficient. Confirm the site's Origin receives the expected Access-Control-Allow-Origin and exposed headers. Changing CORS may require clearing previously cached responses under the provider's guidance.

Cache policy is `public, max-age=31536000, immutable, no-transform` on versioned objects. The application loader still has one in-flight transfer, retained session bytes, Cache Storage fallback, and deferred parsing; CDN setup must support its same byte and progress contracts.

## Verification lanes

- `npm run validate`: source-free media checks, lint, production build (requires CDN URL), portable regression tests.
- `npm run media:verify`: full local source hashes.
- `npm run test:media`: original-file hashes, local range response, full-resolution mouse/keyboard/touch model interactions. Run separately from portable tests so fixture/server modes cannot mix.
- `npm run media:sync -- --dry-run`: local offline upload plan only.

The migration report distinguishes fixture/mock checks from original-asset checks. Neither proves live CDN/CORS/credentials until a storage account and public domain have been configured.
