# Repository and media migration report

Implemented without publishing, uploading, creating cloud resources, committing, pushing, or initializing Git in this working folder.

## Before and after

| Before | After |
|---|---|
| Three capitalized implementation folders, centralized definitions for all projects | Sixteen lowercase route-aligned modules with real definitions; completed implementations preserved |
| Project-name branches in shared preview/detail renderers | Lazy preview, primary, detail and optional preload descriptors in the registry |
| Flat shared components and one shared stylesheet | Components grouped by responsibility; ordered styles entry and project-local experience CSS |
| Six editorial records coupled to IDs in CSS | Independent display/strip order, reusable layout variants, intrinsic dimensions, photograph support |
| Heavy files in root/public, including two GLB copies | One ignored canonical copy of each original; manifest-only development serving and content-addressed CDN URLs |
| 386,886,174 bytes in public | 5,519,486 bytes in public (98.57% reduction, without changing source payloads) |
| Flat test directory requiring originals | Unit, integration, e2e and explicit fixtures; original-media lane retained |

Public byte totals exclude ignored macOS `.DS_Store` metadata.

The full recorded [before tree](tree-before.txt), [after tree](tree-after.txt), and [108-entry move inventory](migration.json) include individual asset relocations, duplicate consolidation, source organization and test moves. The inventory also records data/CSS/documentation extractions.

```text
Before                         After
Textured_mesh_1.glb             media-source/projects/pentimento/Textured_mesh_1.glb
public/media/pentimento/        media-source/projects/pentimento/
sarah_checkin.MOV               media-source/projects/pentimento/sarah_checkin.MOV
public/media/ivan/ originals    media-source/editorial/{publications,video}/
public/media/ivan/ derivatives  public/media/editorial/
public/media/argus/             public/media/projects/argus/
src/projects/{Argus,...}/       src/projects/{argus,pentimento,monte-carlo,...}/
src/components/                src/components/{layout,navigation,project,editorial,media,ui}/
src/data/{projects,articles}.ts src/data/{projects,editorial}/index.ts
src/styles.css                 src/styles/index.css + ordered layers/project styles
tests/*.spec.ts                tests/{unit,integration,e2e}/ + fixtures/
```

## Source integrity

All **31 recorded media-file moves**, including text sidecars, were re-hashed against their recorded pre-migration hashes. The duplicate GLB was removed only after both copies matched the canonical destination. Six canonical originals total **493,894,851 bytes**. No original was reduced, transcoded, compressed, merged, or re-exported.

| Original | Bytes | SHA-256 |
|---|---:|---|
| Pentimento GLB | 233,840,976 | `45b568bac1c1246dd703e9827742b1d0102c4e0ffdb2535046d80ed1822026c0` |
| Pentimento MOV | 112,528,163 | `70a94bc33da656976e08ca0f26a97b9f678ef745d37e7e409e99f0bd421d0aeb` |
| Pentimento browser MP4 | 129,260,636 | `e1d1738e92a6be745fe4bbc43f9644069ba78ab0829c9507b8b962b895923d94` |
| Engineering Newsletter PDF | 1,255,023 | `a1b239068faeba9f006362358d325de584a3f01e8c4db89459145f5a846d6bfd` |
| ACMC Chronicle PDF | 12,554,170 | `6e3a54cde87e6cd0d69522a78bcdf727df3c819090b9a7a55ff9fac5e2ab867b` |
| Alumni MP4 | 4,455,883 | `0295d745cafd354afaa365c20a0e7e6004252f45b4822221c1ba396962d70065` |

The supplied leadership text is byte-identical to the baseline. Existing lightweight banner, photographs, posters, reading-page WebPs and text were relocated unchanged. All real headlines, titles, ordering, status copy, URLs and featured selections are retained.

Thirty-six experience code/style files are byte-identical after relocation, including Pentimento's loader, parser/grouping, viewer, input video and control implementation. The remaining existing experience-file edits are Argus banner resolution, Pentimento asset resolution, and two Monte Carlo import-path changes. No simulation, animation or rendering algorithm changed.

## Verification

- `media:verify`: six original hashes passed.
- `media:check`: manifest/projection, asset references, public-media exclusions, 25 MiB guard and temporary Git-ignore contract passed without needing originals.
- `media:sync --dry-run`: passed offline. No AWS process or remote request was made by the dry run.
- Sync tests: mocked unchanged, changed and missing objects, SHA/size/header comparisons, explicit MIME/cache metadata, post-upload verification and credential failures. No live cloud checks.
- Portable regression suite: **87 passed**; the complete `validate` command passed with a test CDN URL and installed Chrome.
- `test:media`: **5 passed** against the actual originals: hashes, actual HEAD/range bytes, desktop mouse/keyboard orbit/zoom/switch retention and mobile touch orbit/pinch/vertical scroll.
- Build and lint passed. Vite retains the existing large lazy Three.js chunk warning; no new dependency was added.
- Missing production CDN and forbidden local production mode fail as intended.
- CDN-first development, `/portfolio/` base paths, browser and hash routing, record targeting and Back navigation passed using mocked CDN video responses.
- New project #17 and editorial record #7 rendered through production registry/components with ordering, default layout, navigation and independently configured homepage inclusion.
- Offline preparation passed using relocated sources and temporary output. It produced fourteen pages, extracted text and six preview images; committed derivatives were not replaced. macOS codec access required running outside the execution sandbox.
- [Clean-copy build](clean-build-verification.json): passed with `media-source/` omitted, test CDN URL, `/portfolio/` base and hash routing. Existing installed dependencies were linked rather than reinstalled. Output contains **51 files, 6,713,654 bytes**, no GLBs, PDFs, production video, private configuration or source paths. A test secret sentinel was absent from output.

Home, `/ivan`, both readers, AI/ME exhibits, placeholder detail pages and completed experiences were reviewed at desktop/tablet/narrow mobile sizes. Existing interaction tests also capture Argus and Futures key scenes and Pentimento frames. Screenshot artifacts are generated under ignored test output; [comparison metrics](visual-comparison.json) document the saved before/after captures. Lazy media and video capture state can differ between screenshots; source assets and layout dimensions are checked separately.

## Git and cloud status

The workspace still has **no `.git` directory**. Future tracking rules were checked by initializing and deleting only a temporary test repository. Originals, private environment files, dependencies, builds, preparation caches and test output are ignored; manifests, source code, lightweight assets and explicit tiny fixtures remain trackable.

**Deferred:** bucket/domain creation, real AWS CLI credentials, actual synchronization, live public-domain/CORS/range checks and deployment. The CLI is optional and was not installed for this refactor. Provider configuration is documented in [deployment](deployment.md) and [media workflow](media-workflow.md).
