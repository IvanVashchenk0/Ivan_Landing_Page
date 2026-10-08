import { PENTIMENTO_MODEL_STILL } from './media'
import { ModelLoading } from './ModelLoading'
export function ModelPoster({ ready = false }: { ready?: boolean }) {
  return <img className="pentimento-model-still" data-ready={ready} src={PENTIMENTO_MODEL_STILL} width="1000" height="700" alt={ready ? '' : 'Still of the actual Pentimento room reconstruction. Interactive controls become available when loading finishes.'} aria-hidden={ready || undefined} />
}
export function ModelFallback({ failed = false, retry }: { failed?: boolean; retry?: () => void }) {
  return <><div className="pentimento-visual model-visual"><ModelPoster />{failed ? <div className="media-message mono" role="status">RECONSTRUCTION COULD NOT BE LOADED.<button className="model-retry" onClick={retry}>Retry</button></div> : <ModelLoading />}</div><div className="viewer-bottom"><span className="mono viewer-hint">FINAL / RECONSTRUCTION STILL</span></div></>
}

export function MobileModelFallback() {
  return <>
    <div className="pentimento-visual model-visual">
      <img className="pentimento-model-still" data-ready="false" src={PENTIMENTO_MODEL_STILL} width="1000" height="700" alt="Still of the actual Pentimento room reconstruction." />
      <div className="pentimento-mobile-note mono" role="status">FULL-RESOLUTION INTERACTIVE RECONSTRUCTION AVAILABLE ON DESKTOP</div>
    </div>
    <div className="viewer-bottom"><span className="mono viewer-hint">FINAL / RECONSTRUCTION STILL</span></div>
  </>
}
