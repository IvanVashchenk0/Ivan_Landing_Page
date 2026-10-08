type Capability = 'supported' | 'webgl' | 'textures'
let capability: Capability | undefined
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
