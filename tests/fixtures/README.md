# Portable fixtures

`media/model.glb` is a 404-byte untextured triangle generated for loader tests. `media/video.mp4` is a synthetic three-second color animation (160 × 90), not project footage. `media/document.pdf` is a minimal catalog used for URL/range tests; the real readable document pages remain unchanged in public/media/editorial.

Vite serves these only when the test process explicitly sets MEDIA_TEST_FIXTURES=1. Production builds do not include this middleware or these files. `npm run test:media` disables fixture serving and checks the migrated originals.

`growth.tsx` contains a test-only seventeenth project and seventh editorial record. They are never registered in the application.
