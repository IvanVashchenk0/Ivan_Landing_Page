import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localMediaServer } from './scripts/media/dev-server.js'

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const base = env.VITE_BASE_PATH || '/'
  if (command === 'build') {
    if (env.VITE_USE_LOCAL_MEDIA === 'true') throw new Error('Production builds cannot use local originals. Unset VITE_USE_LOCAL_MEDIA and configure VITE_MEDIA_BASE_URL.')
    if (!env.VITE_MEDIA_BASE_URL) throw new Error('Production builds require VITE_MEDIA_BASE_URL. See docs/deployment.md.')
    const url = new URL(env.VITE_MEDIA_BASE_URL)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('VITE_MEDIA_BASE_URL must be a public HTTP(S) base URL without credentials, query, or fragment.')
  }
  return {
    plugins: [react(), ...(env.VITE_USE_LOCAL_MEDIA === 'true' || !env.VITE_MEDIA_BASE_URL ? [localMediaServer(base)] : [])],
    base,
  }
})
