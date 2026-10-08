import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PENTIMENTO_DESKTOP_GLB, PENTIMENTO_MOBILE_GLB } from './media'
import { prepareCustomGLBShell } from './prepareCustomGLBShell'
import { getPentimentoModelLoader } from './modelLoader'
import { ModelLoading } from './ModelLoading'
import { ModelPoster } from './ModelPoster'
import { fullModelCapability, type PentimentoModelVariant } from './capabilities'

type LoadState = 'loading' | 'preparing' | 'ready' | 'error' | 'webgl' | 'unsupported'
interface ViewerControls { reset: () => void; orbit: (horizontal: number, vertical?: number) => void; zoom: (direction: number) => void }

// Dispose shared resources once, without changing any imported material or geometry.
function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const bitmaps = new Set<ImageBitmap>()
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          textures.add(value)
          if (typeof ImageBitmap !== 'undefined' && value.source.data instanceof ImageBitmap) bitmaps.add(value.source.data)
        }
      }
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
  textures.forEach(texture => texture.dispose())
  bitmaps.forEach(bitmap => bitmap.close())
}

export default function ModelViewer({ active, variant }: { active: boolean; variant: PentimentoModelVariant }) {
  const host = useRef<HTMLDivElement>(null)
  const actions = useRef<ViewerControls | null>(null)
  const setActive = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [invalidGeometry, setInvalidGeometry] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = host.current
    if (!element) return
    const mobile = variant === 'mobile'
    const modelURL = mobile ? PENTIMENTO_MOBILE_GLB : PENTIMENTO_DESKTOP_GLB
    const modelLoader = getPentimentoModelLoader(variant)
    // Preserve the existing desktop preflight. Mobile creates only the renderer
    // it will use, after explicit FINAL MODEL selection.
    if (!mobile) {
      const capability = fullModelCapability()
      // oxlint-disable-next-line react/set-state-in-effect
      if (capability !== 'supported') { setState(capability === 'webgl' ? 'webgl' : 'unsupported'); return }
    }
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true }) }
    catch {
      // Synchronize the UI with the browser's renderer initialization failure.
      // oxlint-disable-next-line react/set-state-in-effect
      setState('webgl')
      return
    }
    if (renderer.capabilities.maxTextureSize < (mobile ? 1024 : 8192)) {
      renderer.dispose(); renderer.forceContextLoss(); setState('unsupported'); return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : window.innerWidth < 700 ? 1.5 : 2))
    element.dataset.pixelRatio = String(renderer.getPixelRatio())
    renderer.shadowMap.enabled = false
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    // Keep the scan's authored emissive textures free of tone-map/exposure changes.
    renderer.toneMapping = THREE.NoToneMapping
    renderer.domElement.setAttribute('aria-hidden', 'true')
    element.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 10000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    controls.enableZoom = true
    controls.autoRotateSpeed = 0.35
    controls.minPolarAngle = 0.08
    controls.maxPolarAngle = Math.PI - 0.08
    controls.touches.ONE = THREE.TOUCH.ROTATE
    controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE
    // Mobile dedicates the canvas gesture to one-finger orbit and pinch zoom.
    // The surrounding exhibit remains available for normal page scrolling.
    renderer.domElement.style.touchAction = mobile ? 'none' : 'pan-y'
    // The supplied materials already carry captured lighting in emissive maps.
    // Subdued scene lights avoid washing them out; the materials stay untouched.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x62695a, 0.15))
    const key = new THREE.DirectionalLight(0xffffff, 0.25)
    key.position.set(-3, 4, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xffffff, 0.1)
    rim.position.set(3, 1, -3)
    scene.add(rim)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let disposed = false
    let frame = 0
    let selected = false
    let inView = false
    let contextLost = false
    let hasInteracted = false
    let previousTime = 0
    let lastDraw = 0
    let shell: THREE.Group | null = null
    let bounds = new THREE.Box3()
    let radius = 1
    let settleFrames = 0

    const canDraw = () => !disposed && selected && inView && !document.hidden && !contextLost && shell !== null
    const draw = (time: number) => {
      frame = 0
      if (!canDraw()) return
      // Cap continuous animation at 30fps without lowering model detail or texture resolution.
      if (time - lastDraw < 1000 / 30) { frame = requestAnimationFrame(draw); return }
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0
      previousTime = time
      lastDraw = time
      controls.autoRotate = !mobile && !hasInteracted && !reducedMotion.matches
      controls.update(delta)
      renderer.render(scene, camera)
      element.dataset.renderCount = String(Number(element.dataset.renderCount ?? 0) + 1)
      settleFrames--
      if (!frame && (controls.autoRotate || settleFrames > 0)) frame = requestAnimationFrame(draw)
    }
    const requestDraw = () => {
      settleFrames = 24
      if (canDraw() && !frame) frame = requestAnimationFrame(draw)
    }
    const pause = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0 }
    const fitCamera = () => {
      const vertical = THREE.MathUtils.degToRad(camera.fov) / 2
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
      const direction = new THREE.Vector3(1, 0.6, 1).normalize()
      camera.position.copy(direction)
      camera.lookAt(0, 0, 0)
      const toCameraAxes = camera.quaternion.clone().invert()
      let distance = 0
      // Fit all eight native-bound corners in camera space, without scaling the asset.
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const corner = new THREE.Vector3(x, y, z).applyQuaternion(toCameraAxes)
            distance = Math.max(distance, corner.z + Math.abs(corner.x) / Math.tan(horizontal), corner.z + Math.abs(corner.y) / Math.tan(vertical))
          }
        }
      }
      distance *= 1.1
      camera.near = Math.max(radius / 1000, 0.00001)
      camera.far = distance * 8 + radius
      controls.minDistance = radius * 0.15
      controls.maxDistance = distance * 5
      controls.target.set(0, 0, 0)
      camera.position.copy(direction).multiplyScalar(distance)
      camera.updateProjectionMatrix()
      controls.update()
      requestDraw()
    }
    const onInteraction = () => { hasInteracted = true; controls.autoRotate = false; requestDraw() }
    const resize = () => {
      const box = element.getBoundingClientRect()
      const width = Math.min(box.width, box.height * 10 / 7), height = width * 7 / 10
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      if (shell && !hasInteracted) fitCamera()
      requestDraw()
    }
    const onVisibility = () => { if (document.hidden) pause(); else requestDraw() }
    const onMotionChange = () => { controls.autoRotate = !mobile && !hasInteracted && !reducedMotion.matches; requestDraw() }
    const onContextLost = (event: Event) => { event.preventDefault(); contextLost = true; pause(); setState('webgl') }
    const onContextRestored = () => {
      contextLost = false
      if (!shell) { setState('loading'); return }
      setState('preparing')
      void renderer.compileAsync(scene, camera).then(() => {
        if (disposed || contextLost) return
        renderer.render(scene, camera)
        setState('ready'); requestDraw()
      }).catch(() => { if (!disposed) setState('webgl') })
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) requestDraw(); else pause()
    })
    observer.observe(element)
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(element)
    document.addEventListener('visibilitychange', onVisibility)
    reducedMotion.addEventListener('change', onMotionChange)
    controls.addEventListener('start', onInteraction)
    controls.addEventListener('change', requestDraw)
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)
    setActive.current = value => { selected = value; if (selected) requestDraw(); else pause() }

    const load = async () => {
      let imported: THREE.Object3D | undefined
      try {
        const buffer = await modelLoader.request('high')
        if (disposed) return
        setState('preparing')
        // Let preparation feedback paint before main-thread parsing and GPU setup.
        await new Promise(resolve => window.setTimeout(resolve, 32))
        if (disposed) return
        const parseStart = performance.now()
        const loader = new GLTFLoader()
        const gltf = await loader.parseAsync(buffer, new URL('.', new URL(modelURL, location.href)).href)
        performance.measure('pentimento:model-parse', { start: parseStart, end: performance.now() })
        const prepareStart = performance.now()
        imported = gltf.scene
        if (disposed) { disposeObject(imported); return }
        shell = prepareCustomGLBShell(imported)
        bounds = new THREE.Box3().setFromObject(shell)
        radius = bounds.getSize(new THREE.Vector3()).length() / 2
        scene.add(shell)
        fitCamera()
        actions.current = {
          reset: () => { hasInteracted = false; fitCamera() },
          orbit: (horizontal, vertical = 0) => {
            onInteraction()
            const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target))
            spherical.theta += horizontal * 0.15
            spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical * 0.15, controls.minPolarAngle, controls.maxPolarAngle)
            camera.position.copy(new THREE.Vector3().setFromSpherical(spherical)).add(controls.target)
            controls.update()
            requestDraw()
          },
          zoom: direction => {
            onInteraction()
            const offset = camera.position.clone().sub(controls.target)
            offset.setLength(THREE.MathUtils.clamp(offset.length() * (direction > 0 ? 0.85 : 1.15), controls.minDistance, controls.maxDistance))
            camera.position.copy(controls.target).add(offset)
            controls.update()
            requestDraw()
          },
        }
        performance.measure('pentimento:scene-preparation', { start: prepareStart, end: performance.now() })
        const shaderStart = performance.now()
        await renderer.compileAsync(scene, camera)
        performance.measure('pentimento:shader-preparation', { start: shaderStart, end: performance.now() })
        const renderStart = performance.now()
        if (disposed) return
        if (!contextLost) {
          renderer.render(scene, camera)
          // Keep the still through the first submitted frame; allow the canvas to paint.
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        }
        if (disposed) return
        performance.measure('pentimento:first-frame', { start: renderStart, end: performance.now() })
        const selection = performance.getEntriesByName('pentimento:model-selected').at(-1)
        if (selection) performance.measure('pentimento:selection-to-ready', { start: selection.startTime, end: performance.now() })
        setState(contextLost ? 'webgl' : 'ready')
        requestDraw()
      } catch (error) {
        if (imported && !shell) disposeObject(imported)
        if (!disposed && !(error instanceof DOMException && error.name === 'AbortError')) {
          setInvalidGeometry(error instanceof Error && error.message === 'The GLB contains no viewable mesh geometry.')
          setState('error')
        }
      }
    }
    resize()
    const releaseLoader = mobile ? modelLoader.retain() : () => undefined
    // Delay until after Strict Mode's discarded setup; bytes come from the shared loader.
    const loadTimer = window.setTimeout(() => { void load() }, 0)

    return () => {
      disposed = true
      releaseLoader()
      window.clearTimeout(loadTimer)
      pause()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMotion.removeEventListener('change', onMotionChange)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
      controls.removeEventListener('start', onInteraction)
      controls.removeEventListener('change', requestDraw)
      controls.dispose()
      if (shell) disposeObject(shell)
      renderer.dispose()
      renderer.domElement.remove()
      actions.current = null
      setActive.current = null
    }
  }, [attempt, variant])

  useEffect(() => { setActive.current?.(active) }, [active, attempt, variant])

  return <>
    <div className="pentimento-visual model-visual">
      <ModelPoster ready={state === 'ready'} />
      <div ref={host} className="object-canvas" role="group" tabIndex={active && state === 'ready' ? 0 : -1} aria-label="Interactive Pentimento reconstruction. Drag to orbit, scroll or pinch to zoom. Arrow keys rotate; plus and minus zoom." aria-busy={state === 'loading' || state === 'preparing'} data-model-state={state} data-model-variant={variant} onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) event.preventDefault()
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') actions.current?.orbit(event.key === 'ArrowLeft' ? -1 : 1)
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') actions.current?.orbit(0, event.key === 'ArrowUp' ? -1 : 1)
        if (event.key === '+' || event.key === '=' || event.key === '-') actions.current?.zoom(event.key === '-' ? -1 : 1)
      }} />
      {(state === 'loading' || state === 'preparing') && <ModelLoading preparing={state === 'preparing'} variant={variant} />}
      {state === 'ready' && <span className="sr-only" role="status">Reconstruction ready.</span>}
      {(state === 'error' || state === 'webgl' || state === 'unsupported') && <div className="media-message mono" role="status">
        <span>{state === 'unsupported' ? variant === 'mobile' ? '3D VIEW IS NOT SUPPORTED ON THIS DEVICE. SHOWING THE REAL RECONSTRUCTION STILL.' : 'FULL-RESOLUTION 3D REQUIRES 8K TEXTURE SUPPORT. SHOWING THE REAL RECONSTRUCTION STILL.' : state === 'webgl' ? '3D VIEW REQUIRES WEBGL. SHOWING THE REAL RECONSTRUCTION STILL.' : invalidGeometry ? 'NO VIEWABLE GEOMETRY IN THIS GLB.' : 'RECONSTRUCTION COULD NOT BE LOADED.'}</span>
        {state === 'error' && <button className="model-retry" onClick={() => { setState('loading'); setAttempt(value => value + 1) }}>Retry</button>}
      </div>}
    </div>
    <div className="viewer-bottom">
      <span className="mono viewer-hint">{state === 'ready' ? 'FINAL / 3D RECONSTRUCTION' : 'FINAL / RECONSTRUCTION STILL'}{state === 'ready' && <span className="model-gesture-hint">DRAG TO INSPECT · SCROLL / PINCH TO ZOOM</span>}</span>
      <div className="viewer-controls">
        <button onClick={() => actions.current?.zoom(-1)} disabled={state !== 'ready'} aria-label="Zoom out">−</button>
        <button onClick={() => actions.current?.zoom(1)} disabled={state !== 'ready'} aria-label="Zoom in">+</button>
        <button onClick={() => actions.current?.reset()} disabled={state !== 'ready'}>Reset view <span aria-hidden="true">↺</span></button>
      </div>
    </div>
  </>
}
