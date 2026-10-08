import { PENTIMENTO_DESKTOP_GLB, PENTIMENTO_MOBILE_GLB } from './media'
import { pentimentoModelVariant, type PentimentoModelVariant } from './capabilities'

// Bump this version whenever the source GLB changes. The original URL stays compatible.
export const MODEL_CACHE = 'pentimento-assets-v1'
export type DownloadSnapshot = {
  phase: 'idle' | 'checking' | 'downloading' | 'downloaded' | 'error'
  received: number
  total: number | null
  source: 'network' | 'cache' | null
}
type Dependencies = {
  url?: string
  fetch?: typeof fetch
  openCache?: () => Promise<Cache | undefined>
  allowRequest?: () => boolean
}
const initial: DownloadSnapshot = { phase: 'idle', received: 0, total: null, source: null }

function validate(buffer: ArrayBuffer) {
  if (buffer.byteLength < 12) throw new Error('Incomplete GLB')
  const header = new DataView(buffer)
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== buffer.byteLength) throw new Error('Invalid GLB')
}

export function createModelLoader(dependencies: Dependencies = {}) {
  const url = dependencies.url ?? PENTIMENTO_DESKTOP_GLB
  const fetchModel = dependencies.fetch ?? ((...args) => fetch(...args))
  const openCache = dependencies.openCache ?? (async () => typeof caches === 'undefined' ? undefined : caches.open(MODEL_CACHE))
  const allowRequest = dependencies.allowRequest ?? (() => true)
  let snapshot = initial
  let bytes: ArrayBuffer | undefined
  let flight: Promise<ArrayBuffer> | undefined
  let controller: AbortController | undefined
  let consumers = 0
  let cleanup: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const publish = (next: DownloadSnapshot) => { snapshot = next; listeners.forEach(listener => listener()) }

  const request = (priority: 'auto' | 'high' | 'low' = 'auto'): Promise<ArrayBuffer> => {
    if (!allowRequest()) return Promise.reject(new Error('Pentimento model selection does not match this device.'))
    if (bytes) return Promise.resolve(bytes)
    if (flight) {
      // A rapid route remount may arrive while the previous abort is still settling.
      // Wait for that stream to release its resources, then start exactly one fresh request.
      if (controller?.signal.aborted) return flight.then(() => request(priority), () => request(priority))
      return flight
    }
    const abort = new AbortController()
    controller = abort
    publish({ ...initial, phase: 'checking' })
    flight = (async () => {
      let cache: Cache | undefined
      try { cache = await openCache() } catch { /* Storage is optional, including private mode/quota restrictions. */ }
      abort.signal.throwIfAborted()
      if (cache) {
        try {
          const stored = await cache.match(url)
          if (stored) {
            const buffer = await stored.arrayBuffer()
            abort.signal.throwIfAborted()
            try { validate(buffer) } catch {
              // Evict only invalid bytes, never a usable cache entry during normal interaction.
              await cache.delete(url).catch(() => false)
              throw new Error('Invalid cached GLB')
            }
            bytes = buffer
            publish({ phase: 'downloaded', received: buffer.byteLength, total: buffer.byteLength, source: 'cache' })
            return buffer
          }
        } catch { /* A failed cache read falls through to the normal HTTP request. */ }
      }
      abort.signal.throwIfAborted()
      const downloadStart = performance.now()
      const response = await fetchModel(url, { signal: abort.signal, priority })
      if (!response.ok) throw new Error(`Model request failed: ${response.status}`)
      const length = Number(response.headers.get('content-length'))
      // Content-Length can describe encoded transport bytes; never use it for decoded-body percentages.
      const total = !response.headers.get('content-encoding') && Number.isSafeInteger(length) && length > 0 ? length : null
      publish({ phase: 'downloading', received: 0, total, source: 'network' })
      let buffer: ArrayBuffer
      if (response.body) {
        const reader = response.body.getReader()
        let output = total && total <= 1024 ** 3 ? new Uint8Array(total) : undefined
        const chunks: Uint8Array[] = []
        let received = 0, lastUpdate = 0
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (output && received + value.byteLength > output.byteLength) {
              chunks.push(output.subarray(0, received))
              output = undefined
            }
            if (output) output.set(value, received)
            else chunks.push(value)
            received += value.byteLength
            const now = performance.now()
            if (now - lastUpdate >= 120) {
              publish({ phase: 'downloading', received, total: total && received <= total ? total : null, source: 'network' })
              lastUpdate = now
            }
          }
        } catch (error) {
          await reader.cancel().catch(() => undefined)
          throw error
        } finally { reader.releaseLock() }
        if (output) buffer = received === output.byteLength ? output.buffer : output.buffer.slice(0, received)
        else {
          const complete = new Uint8Array(received)
          let offset = 0
          for (const chunk of chunks) { complete.set(chunk, offset); offset += chunk.byteLength }
          chunks.length = 0
          buffer = complete.buffer
        }
      } else buffer = await response.arrayBuffer()
      abort.signal.throwIfAborted()
      validate(buffer)
      performance.measure('pentimento:model-download', { start: downloadStart, end: performance.now() })
      bytes = buffer
      publish({ phase: 'downloaded', received: buffer.byteLength, total: buffer.byteLength, source: 'network' })
      if (cache) {
        // Cache the exact completed payload, without teeing a second slow stream during download.
        // The temporary Response is released after the write; the session retains one ArrayBuffer.
        const headers = new Headers(response.headers)
        headers.delete('content-encoding')
        headers.set('content-length', String(buffer.byteLength))
        try { void cache.put(url, new Response(buffer, { headers })).catch(() => undefined) } catch { /* Cache write failure cannot prevent display. */ }
      }
      return buffer
    })().catch(error => {
      publish({ ...snapshot, phase: abort.signal.aborted ? 'idle' : 'error' })
      throw error
    }).finally(() => { flight = undefined; controller = undefined })
    return flight
  }

  return {
    request,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    retain: () => {
      consumers++
      clearTimeout(cleanup)
      return () => {
        consumers--
        if (!consumers) cleanup = setTimeout(() => controller?.abort(), 0)
      }
    },
  }
}
export const pentimentoDesktopModelLoader = createModelLoader({
  url: PENTIMENTO_DESKTOP_GLB,
  allowRequest: () => pentimentoModelVariant() === 'desktop',
})
export const pentimentoMobileModelLoader = createModelLoader({
  url: PENTIMENTO_MOBILE_GLB,
  allowRequest: () => pentimentoModelVariant() === 'mobile',
})
export const getPentimentoModelLoader = (variant: PentimentoModelVariant) => variant === 'mobile' ? pentimentoMobileModelLoader : pentimentoDesktopModelLoader
// Compatibility alias for existing desktop loading tests.
export const pentimentoModelLoader = pentimentoDesktopModelLoader

export function canPrefetchModel() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number } }).connection
  return !(connection?.downlink !== undefined && connection.downlink < 8) && !(connection?.rtt !== undefined && connection.rtt > 300) && !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
}
