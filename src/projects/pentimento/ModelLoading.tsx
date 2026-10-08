import { useSyncExternalStore } from 'react'
import { getPentimentoModelLoader } from './modelLoader'
import type { PentimentoModelVariant } from './capabilities'
import './loading.css'

export function ModelLoading({ preparing = false, variant = 'desktop' }: { preparing?: boolean; variant?: PentimentoModelVariant }) {
  const modelLoader = getPentimentoModelLoader(variant)
  const download = useSyncExternalStore(modelLoader.subscribe, modelLoader.getSnapshot)
  const complete = preparing || download.phase === 'downloaded'
  const percent = download.total ? Math.min(99, Math.floor(download.received / download.total * 100)) : null
  const mib = (bytes: number) => (bytes / 1024 ** 2).toFixed(1)
  return <div className="media-message mono pentimento-loading" data-loading-phase={complete ? 'preparing' : download.phase}>
    <span role="status">{complete ? 'PREPARING INTERACTIVE MODEL…' : 'LOADING INTERACTIVE MODEL'}</span>
    {!complete && <div className="pentimento-download-details">
      {download.phase === 'downloading' && <>
        {download.total !== null && <progress aria-label="Pentimento reconstruction download" max={download.total} value={Math.min(download.received, download.total)} />}
        {percent !== null && <span>{percent}%</span>}
        <span>{mib(download.received)} MiB{download.total ? ` / ${mib(download.total)} MiB` : ' RECEIVED'}</span>
      </>}
      {download.phase === 'checking' && <span>CHECKING SAVED MODEL…</span>}
    </div>}
    <small>{variant === 'mobile' ? 'MOBILE INTERACTIVE RECONSTRUCTION' : 'FULL-RESOLUTION RECONSTRUCTION'}</small>
  </div>
}
