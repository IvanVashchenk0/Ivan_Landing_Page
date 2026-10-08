# Media workflow

Heavy originals live in ignored `media-source/`. Back them up separately; a future Git checkout intentionally will not contain them. Copying an original into `public/` is not a deployment strategy. Lightweight derivatives remain committed and buildable without macOS, Pillow, AWS, or originals.

| Logical ID | Canonical path relative to media-source |
|---|---|
| pentimento.model | projects/pentimento/Textured_mesh_1.glb |
| pentimento.source-video | projects/pentimento/sarah_checkin.MOV |
| pentimento.input-video | projects/pentimento/sarah_checkin.mp4 |
| editorial.engineering-newsletter | editorial/publications/engineering-newsletter.pdf |
| editorial.acmc-chronicle | editorial/publications/acmc-chronicle.pdf |
| editorial.alumni-video | editorial/video/alumni-video.mp4 |

Full sizes and SHA-256 values are committed in `scripts/media/manifest.json` and the [migration inventory](migration.json). `sourcePath` is relative to repository `media-source/`; `remotePath` preserves its hierarchy and adds the entire SHA-256 before the extension. URLs change when content changes, while logical IDs remain stable. This also separates Pentimento cache entries correctly without rewriting its loader.

```sh
npm run media:verify
npm run media:manifest -- --register project.asset=projects/project/asset.glb
# Only after intentionally replacing source bytes:
npm run media:manifest -- --update-existing
npm run media:check
npm run media:sync -- --dry-run
```

Manifest generation recursively discovers sources. New files get their relative path as a default ID unless explicitly registered. Existing IDs cannot be silently renamed. Missing originals or changed hashes fail instead of silently resetting a baseline. `media:verify` stream-hashes without rewriting anything. Review both manifest projections after registration. The browser projection excludes source paths.

`media:check` needs no originals or credentials. It checks manifest/projection consistency, references, ignored paths using a temporary Git repository, forbidden deployment originals, and files over **25 MiB** outside ignored/generated locations. There are no large tracked-file exceptions. Original PDFs, GLBs and production videos are rejected in public even below that threshold. Tiny clearly documented test fixtures are outside public.

## Development

With `VITE_MEDIA_BASE_URL`, development resolves heavy assets to that CDN. With no CDN, or `VITE_USE_LOCAL_MEDIA=true`, a development-only manifest allowlist serves unchanged files at `/__media/<content-addressed-key>`, honoring Vite's base path. GET/HEAD and single byte ranges are supported; traversal, unlisted paths and files outside the source root are rejected. Local responses use no-cache so stale local bytes cannot masquerade as updated originals.

Production rejects missing CDN configuration or local mode. It reads only the committed browser manifest and public lightweight assets. The local endpoint does not exist in the production output.

## Optional upload tooling

The preferred workflow uses the `ivan-r2` AWS CLI profile and `R2_BUCKET`, `R2_ENDPOINT`, `R2_REGION`, `R2_AWS_PROFILE`, and optional `R2_PUBLIC_BASE_URL` in ignored `.env.media.local`. Follow the [manual setup checklist](r2-setup.md). The earlier `MEDIA_*` names and optional AWS environment credentials remain fallback-compatible. Never prefix credentials with `VITE_`.

`npm run media:connection` verifies CLI v2, profile existence, and read-only bucket access. Real synchronization repeats this precheck before inspecting or uploading objects.

`npm run media:sync -- --dry-run` is completely offline: verifies local sources and lists the proposed keys, without reading upload secrets or invoking AWS. It cannot claim a remote object exists.

Actual `npm run media:sync` verifies every source before calling AWS, checks CLI v2, then uses head-object metadata and ContentLength to skip matching objects. New/changed objects receive explicit MIME type, immutable/no-transform cache policy, and `sha256` metadata; post-upload headers are verified. Multipart ETags are never interpreted as SHA-256. Credential/permission failures abort, with provider stderr withheld. Argument arrays avoid shell interpolation. No bucket creation, deletion, or old-version cleanup is implemented.

R2 uses its S3 API endpoint for upload; the public custom domain is the separate browser-facing CDN URL. This follows the provider's [AWS CLI workflow](https://developers.cloudflare.com/r2/examples/aws/aws-cli/).

## Derivative preparation

`npm run media:prepare` verifies originals, runs the existing Swift PDFKit/AVFoundation page/text/poster preparation and Python 3.11+ Pillow image conversion, then verifies originals again. This is an optional macOS authoring task. Source photographs are fetched from the existing verified URLs into the temporary cache if absent.

Override locations using `--source PATH --temporary PATH --output PATH`; defaults are `media-source`, `.cache/media`, and `public/media/editorial`. The Swift and Python programs accept explicit paths and do not reference Downloads or a fixed system temporary directory. They never copy PDF/video/GLB originals back into public. Pentimento's existing browser MP4 and full GLB are preserved, not regenerated.
