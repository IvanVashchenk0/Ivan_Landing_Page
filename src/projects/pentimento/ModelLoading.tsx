import { useSyncExternalStore } from 'react'
import { pentimentoModelLoader } from './modelLoader'
import './loading.css'

export function ModelLoading({ preparing = false }: { preparing?: boolean }) {
  const download = useSyncExternalStore(pentimentoModelLoader.subscribe, pentimentoModelLoader.getSnapshot)
  const complete = preparing || download.phase === 'downloaded'
  const percent = download.total ? Math.min(99, Math.floor(download.received / download.total * 100)) : null
  const mib = (bytes: number) => (bytes / 1024 ** 2).toFixed(1)
  return <div className="media-message mono pentimento-loading" data-loading-phase={complete ? 'preparing' : download.phase}>
    <span role="status">{complete ? 'PREPARING RECONSTRUCTION…' : 'LOADING RECONSTRUCTION'}</span>
    {!complete && <div className="pentimento-download-details">
      {download.phase === 'downloading' && <>
        {download.total !== null && <progress aria-label="Full-resolution reconstruction download" max={download.total} value={Math.min(download.received, download.total)} />}
        {percent !== null && <span>{percent}%</span>}
        <span>{mib(download.received)} MiB{download.total ? ` / ${mib(download.total)} MiB` : ' RECEIVED'}</span>
      </>}
      {download.phase === 'checking' && <span>CHECKING SAVED MODEL…</span>}
    </div>}
    <small>FULL-RESOLUTION RECONSTRUCTION</small>
  </div>
}
