# Architecture

The application remains a frontend-only Vite SPA. Shared components are grouped by responsibility; project code and styling stay with their project. There are no additional runtime dependencies.

```text
src/
  App.tsx                  routing and shared layout
  pages/                   simple pages; Ivan/ groups composition and reader
  components/
    layout/                header and footer
    navigation/            navigation and scroll links
    project/               preview, sections, content, adjacent-project navigation
    editorial/             moving material strip and editorial styles
    media/                 reusable video presentations
    ui/                    shared arrow
  projects/<slug>/
    data.ts                one definition for every project
    ...                    existing code for completed experiences
  types/project.ts         optional content and lazy-loading contracts
  data/
    projects/              aggregate registry, featured/category/neighbor selectors
    navigation/            categories and separate Leadership navigation
    editorial/             ordered records and verbatim leadership text
    media/                 URL API and generated browser-safe manifest
  styles/                  ordered reset/base/layout/presentation/responsive rules
public/media/
  projects/argus/           original lightweight banner
  editorial/               photographs, posters, page WebPs and extracted text
media-source/              ignored canonical heavy originals
scripts/media/             manifest, verify, prepare, sync, check; development server
  prepare/                 offline Swift/Python derivative preparation
  lib/                     server-side hashing and AWS wrapper
 tests/                    unit/, integration/, e2e/, fixtures/
```

The registry creates stable lazy component types once. Generic preview/page renderers select those types without checking project names. Preview and primary loaders may differ (Argus); detailed content is independently lazy. Pentimento's optional preload descriptor retains its 1,200px code warm-up; the ordinary experience boundary stays 250px. A project-specific style identifier preserves existing exhibit classes, not logic dispatch.

Category introductions, labels, URLs, and types derive from `data/navigation/categories.ts`. Adjacent links use category ordering and stop at boundaries. Homepage `featuredOrder` remains independent of category `order`.

Editorial `order` controls `/ivan`; optional `stripOrder` controls inclusion and order in Home. Layout variants replace ID-specific CSS while retaining the six existing placements. Image dimensions and optional crop positioning belong to records. New records get a repeating default layout; nothing requires an ID-specific stylesheet. Videos keep independent playback positions across repeated strip copies. Article/document/video/profile/photograph records omit metadata that has not been supplied.

CSS enters through `styles/index.css` in the same cascade layer order: reset, base, layout, components, responsive. Existing selectors and responsive values are retained. Pentimento's viewer rules are stored with that project and imported in the ordered entry; loading its JavaScript does not change CSS precedence.

Media resolution has two explicit contracts: `mediaUrl(logicalId)` uses a manifested heavy original; `localMedia(relativePublicPath)` uses a lightweight deployment-base-aware asset. `MediaReference` distinguishes these for shared components. The browser projection contains no source paths or upload configuration. Production never opens `media-source/`; only the development middleware and offline tools do.

The demonstration algorithms, model geometry/material handling, single-stream cache, playback logic, and source content are unchanged. Detailed methodology is in `docs/projects/`.
