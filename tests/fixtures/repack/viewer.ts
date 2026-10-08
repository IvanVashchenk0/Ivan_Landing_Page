import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { prepareCustomGLBShell } from '../../../src/projects/pentimento/prepareCustomGLBShell'

// Test-only harness. No production routes, loading behavior or rendering code changed.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(1000, 700)
renderer.setClearColor(0x000000, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.NoToneMapping
renderer.toneMappingExposure = 1
if (renderer.capabilities.maxTextureSize < 8192) throw new Error('Full-resolution comparison requires 8192px texture support')
document.body.appendChild(renderer.domElement)
const scene = new THREE.Scene()
scene.add(new THREE.HemisphereLight(0xffffff, 0x62695a, 0.15))
const key = new THREE.DirectionalLight(0xffffff, 0.25); key.position.set(-3,4,4); scene.add(key)
const rim = new THREE.DirectionalLight(0xffffff, 0.1); rim.position.set(3,1,-3); scene.add(rim)
const camera = new THREE.PerspectiveCamera(34, 1000 / 700, 0.01, 10000)
let bounds: THREE.Box3, radius: number
function setView(view: string) {
  const direction = new THREE.Vector3(...(view === 'opposite' ? [-1,0.6,-1] : [1,0.6,1]) as [number,number,number]).normalize()
  camera.position.copy(direction); camera.lookAt(0,0,0)
  const inverse = camera.quaternion.clone().invert(), vertical = THREE.MathUtils.degToRad(camera.fov) / 2
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
  let distance = 0
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
    const corner = new THREE.Vector3(x,y,z).applyQuaternion(inverse)
    distance = Math.max(distance, corner.z + Math.abs(corner.x)/Math.tan(horizontal), corner.z + Math.abs(corner.y)/Math.tan(vertical))
  }
  distance *= 1.1
  camera.near = Math.max(radius/1000,0.00001); camera.far = distance*8+radius
  camera.position.copy(direction).multiplyScalar(distance * (view === 'detail' ? 0.55 : view === 'wide' ? 1.35 : 1))
  camera.updateProjectionMatrix()
}
Object.assign(window, {
  async runRepackComparison(url: string) {
    const start = performance.now()
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('Download failed ' + response.status)
    const buffer = await response.arrayBuffer(), downloaded = performance.now()
    const gltf = await new GLTFLoader().parseAsync(buffer, new URL('.',url).href), parsed = performance.now()
    const shell = prepareCustomGLBShell(gltf.scene)
    scene.add(shell); bounds = new THREE.Box3().setFromObject(shell); radius = bounds.getSize(new THREE.Vector3()).length()/2
    setView('primary')
    const prepared = performance.now()
    await renderer.compileAsync(scene,camera)
    const compiled = performance.now()
    renderer.render(scene,camera)
    renderer.getContext().finish()
    await new Promise(requestAnimationFrame)
    const firstFrame = performance.now()
    return { bytes: buffer.byteLength, downloadMs: downloaded-start, parseMs: parsed-downloaded, scenePreparationMs: prepared-parsed, shaderPreparationMs: compiled-prepared, firstRenderMs: firstFrame-compiled, firstFrameFromStartMs: firstFrame-start, maxTextureSize: renderer.capabilities.maxTextureSize, renderer: renderer.getContext().getParameter(renderer.getContext().RENDERER) }
  },
  captureRepackView(view: string) { setView(view); renderer.render(scene,camera); renderer.getContext().finish(); return renderer.domElement.toDataURL('image/png') },
})
