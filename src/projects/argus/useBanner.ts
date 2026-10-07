import { useEffect, useState } from 'react'
import { localMedia } from '../../data/media/config'
export const ARGUS_BANNER = localMedia('media/projects/argus/ARGUS%20Banner.png')

export function useBanner() {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const src = `${ARGUS_BANNER}${attempt ? `?retry=${attempt}` : ''}`
  useEffect(() => {
    let active = true
    const image = new Image()
    image.src = src
    image.decode().then(() => { if (active) setStatus('ready') }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [src])
  const retry = () => { setStatus('loading'); setAttempt(value => value + 1) }
  return { src, status, retry }
}
