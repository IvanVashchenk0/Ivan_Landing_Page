# Add a project

1. Create `src/projects/<lowercase-route-slug>/data.ts` with a `ProjectDefinition`.
2. Import that definition once in `src/data/projects/index.ts` and append it to `createProjectRegistry(...)`.
3. Set category/order; optionally set `featured` and `featuredOrder`. No page, router, renderer, or other project needs a name-specific branch.

```ts
import type { ProjectDefinition } from '../../types/project'
export default {
  id: 'new-project', title: 'New Project', category: 'ai', order: 9,
  previewType: 'placeholder',
} satisfies ProjectDefinition
```

Slug and `/projects/<slug>` route default from the ID. IDs and routes must be unique. Content is optional; never add fictional case-study text to satisfy an interface. Empty sections do not render.

For custom experiences, use `previewType: 'component'` and `preview: { load: () => import('./Preview') }`. The module exports a default React component. Optional `primaryLoad` supplies a different full-page experience; `projectPage.loadContent` supplies lazy detailed content. An optional `preview.preload: { margin, load }` warms code without parsing media or creating a viewer. Media IDs may be listed in `media` for auditing.

Supplied image/video/audio use `previewType: 'media'` with `previewMedia`. Its `src` (and optional video poster) is `{ kind: 'local', path: 'media/...' }` or `{ kind: 'remote', id: 'manifested.logical.id' }`. Video controls and custom interactions are never wrapped in navigation links. The section's title and EXPLORE PROJECT navigate.

Use `sections` for real overview/problem/approach/results/contribution text, media, or links. Custom detailed components are optional. The complete experiences keep their existing code and styles in their own modules.

# Add editorial material

Add a typed record to `src/data/editorial/index.ts`. Set a unique ID, accessible name, real title and `order`. Set `stripOrder` only to feature it in the strip. Optional verified metadata stays optional. Supply intrinsic `imageWidth`/`imageHeight` for photographs and document previews. Select an optional `layout` (`lead`, `portrait`, `wide`, `text`, `side`, `spread`); otherwise the next default placement is used.

- `article`: local optimized image, alt text and unchanged original URL.
- `photograph`: local image and alt text; optional source URL.
- `document`: local preview, manifest PDF ID, page count/initial page; derived pages and text under `public/media/editorial/<id>/`.
- `video`: local poster, manifest video ID and original-post URL.
- `profile`: supplied paragraphs, preserved verbatim.

Reader routes and record focus links derive from the record ID. No extra route is needed. Do not change the original source to improve a preview. Use the media workflow for registration and lightweight derivatives.

`tests/fixtures/growth.tsx` verifies a seventeenth custom project and seventh photograph through the same production renderers; these definitions are test-only.
