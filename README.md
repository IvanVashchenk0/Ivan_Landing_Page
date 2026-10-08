# Ivan Vashchenko — personal website

React + TypeScript + Vite. Sixteen projects, real editorial material, and the existing Argus, Pentimento, and 10,000 Futures experiences.

Use **Node 22.12+ within Node 22**:

```sh
npm ci
npm run dev
```

Development uses a configured `VITE_MEDIA_BASE_URL`, or unchanged originals in ignored `media-source/` when no CDN is configured. A source-free checkout can run the portable tests using included tiny fixtures.

Production requires a public CDN URL:

```sh
VITE_MEDIA_BASE_URL=https://media.example.com npm run validate
```

`validate` checks media contracts, lints, builds, and runs portable Playwright tests. Install Playwright Chromium (`npx playwright install chromium`) or use `PLAYWRIGHT_CHANNEL=chrome` with installed Chrome. `npm run media:verify` and `npm run test:media` additionally require the local originals.

- [Architecture and repository map](docs/architecture.md)
- [Media workflow and original-file inventory](docs/media-workflow.md)
- [Adding a project or editorial record](docs/adding-a-project.md)
- [CDN, CORS, Vercel, and GitHub Pages setup](docs/deployment.md)
- Project methodology: [Argus](docs/projects/argus.md), [Pentimento](docs/projects/pentimento.md), [10,000 Futures](docs/projects/monte-carlo.md)
- [Migration report](docs/migration-report.md) and [complete move/hash inventory](docs/migration.json)

No cloud resources are created by development or build commands. Media synchronization is a separate, explicit workflow. Git excludes heavy originals and private configuration; only the documented tiny test fixtures are included.

## Heavy media

Fill the ignored `.env.media.local` R2 settings, then manually configure `aws configure --profile ivan-r2`.

```sh
npm run media:verify
npm run media:connection
npm run media:sync -- --dry-run
# Inspect the plan; only after approving it yourself:
npm run media:sync
```

See the [exact R2 setup checklist](docs/r2-setup.md) for profile prompts, configuration fields, and future public-domain setup. Nothing uploads automatically.
