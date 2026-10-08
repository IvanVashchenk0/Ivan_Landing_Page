import { PENTIMENTO_MODEL_STILL } from './media'
import { ModelLoading } from './ModelLoading'
import type { PentimentoModelVariant } from './capabilities'
export function ModelPoster({ ready = false }: { ready?: boolean }) {
  return <img className="pentimento-model-still" data-ready={ready} src={PENTIMENTO_MODEL_STILL} width="1000" height="700" alt={ready ? '' : 'Still of the actual Pentimento room reconstruction. Interactive controls become available when loading finishes.'} aria-hidden={ready || undefined} />
}
export function ModelFallback({ failed = false, retry, variant = 'desktop' }: { failed?: boolean; retry?: () => void; variant?: PentimentoModelVariant }) {
  return <><div className="pentimento-visual model-visual"><ModelPoster />{failed ? <div className="media-message mono" role="status">RECONSTRUCTION COULD NOT BE LOADED.<button className="model-retry" onClick={retry}>Retry</button></div> : <ModelLoading variant={variant} />}</div><div className="viewer-bottom"><span className="mono viewer-hint">FINAL / RECONSTRUCTION STILL</span></div></>
}
