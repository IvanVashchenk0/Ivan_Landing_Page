type Capability = 'supported' | 'webgl' | 'textures'
let capability: Capability | undefined

type NavigatorWithHints = Navigator & {
  userAgentData?: { mobile?: boolean }
}

/**
 * The full scan is intentionally desktop-only until a separate mobile asset has
 * been verified. This check must run before importing Three.js, opening the
 * model cache, fetching the GLB, or creating a WebGL context.
 */
export function canUseInteractivePentimentoModel() {
  const navigatorWithHints = navigator as NavigatorWithHints
  const touchCapable = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches
  const mobileHint = navigatorWithHints.userAgentData?.mobile === true
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(navigator.userAgent)
  const desktopModeIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return !(touchCapable || mobileHint || mobileUserAgent || desktopModeIPad)
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
