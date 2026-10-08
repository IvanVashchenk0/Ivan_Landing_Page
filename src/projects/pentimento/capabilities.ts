type Capability = 'supported' | 'webgl' | 'textures'
let capability: Capability | undefined
export type PentimentoModelVariant = 'desktop' | 'mobile'

type NavigatorWithHints = Navigator & {
  userAgentData?: { mobile?: boolean }
}

/** Selects one model before viewer import, cache access, download, or parsing. */
export function pentimentoModelVariant(): PentimentoModelVariant {
  const navigatorWithHints = navigator as NavigatorWithHints
  const touchCapable = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches
  const mobileHint = navigatorWithHints.userAgentData?.mobile === true
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(navigator.userAgent)
  const desktopModeIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return touchCapable || mobileHint || mobileUserAgent || desktopModeIPad ? 'mobile' : 'desktop'
}

/** A short-lived capability probe, never a second model renderer. */
export function fullModelCapability(): Capability {
  if (capability !== undefined) return capability
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  if (!gl) return (capability = 'webgl')
  capability = gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 8192 ? 'supported' : 'textures'
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return capability
}
export const canRenderFullModel = () => fullModelCapability() === 'supported'
