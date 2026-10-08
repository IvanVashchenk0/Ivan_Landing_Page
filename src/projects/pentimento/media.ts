import { mediaUrl, localMedia } from '../../data/media/config'

export const PENTIMENTO_DESKTOP_GLB = mediaUrl('pentimento.model-binary-repacked')
export const PENTIMENTO_MOBILE_GLB = mediaUrl('pentimento.model-mobile')
// Compatibility alias for desktop-only diagnostics and preservation tests.
export const PENTIMENTO_GLB = PENTIMENTO_DESKTOP_GLB
export const PENTIMENTO_INPUT_VIDEO = mediaUrl('pentimento.input-video-web')
export const PENTIMENTO_PLAYBACK_RATE = 1
export const PENTIMENTO_INPUT_POSTER = localMedia('media/projects/pentimento/input-poster.webp')
export const PENTIMENTO_MODEL_STILL = localMedia('media/projects/pentimento/model-still.webp')
