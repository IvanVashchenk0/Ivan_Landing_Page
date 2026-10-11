import { localMedia } from '../../data/media/config'

export interface SortingImage {
  id: string
  src: string
  label: string
  alt: string
  width: number
  height: number
}

function image(id: string, label: string, alt: string, width: number, height: number): SortingImage {
  return { id, src: localMedia(`media/projects/autonomous-sorting/${id}.webp`), label, alt, width, height }
}

export const sortingImages = {
  prototypeComplete: image('01-prototype-complete', 'PHYSICAL PROTOTYPE', 'Complete autonomous sorting machine physical prototype on the engineering workbench', 960, 1280),
  prototypeSide: image('02-prototype-side', 'SIDE ASSEMBLY', 'Side view of the assembled autonomous sorting machine prototype', 960, 1280),
  mechanismCloseup: image('03-mechanism-closeup', 'SORTING MECHANISM', 'Close view of the sorting mechanism and clear acrylic enclosure', 960, 1280),
  hopperCloseup: image('04-hopper-closeup', 'GRAVITY-FED HOPPER', 'Close view of the gravity-fed hopper and camera assembly', 960, 1280),
  prototypeWorkbench: image('05-prototype-workbench', 'PROTOTYPE DEVELOPMENT', 'Autonomous sorting machine during physical prototype development', 720, 1280),
  assemblyWorkbench: image('06-assembly-workbench', 'PHYSICAL ASSEMBLY', 'Sorting machine components arranged during physical assembly', 960, 1280),
  cadIsometric: image('07-cad-isometric', 'SOLIDWORKS ASSEMBLY', 'SolidWorks isometric assembly view of the autonomous sorting machine', 1043, 761),
  cadFront: image('08-cad-front', 'FRONT', 'Front SolidWorks view of the autonomous sorting machine', 1276, 1049),
  cadSide: image('09-cad-side', 'SIDE', 'Side SolidWorks view of the autonomous sorting machine', 757, 726),
  cadTop: image('10-cad-top', 'TOP', 'Top SolidWorks layout of the autonomous sorting machine', 392, 427),
  visionResult: image('11-vision-result', 'CLASSIFICATION TEST 01', 'Raspberry Pi camera classification test projected above the physical test bench', 720, 1280),
  visionResultAlt: image('12-vision-result-alt', 'CLASSIFICATION TEST 02', 'Additional Raspberry Pi camera classification test showing the captured bearing result', 720, 1280),
  conceptSketch: image('13-original-concept-sketch', 'INITIAL CONCEPT', 'Original hand-drawn autonomous sorting machine system concept', 2048, 1152),
  assemblyDrawing: image('14-cad-assembly-drawing', 'ASSEMBLY DRAWING', 'Detailed SolidWorks assembly drawing with exploded and assembled machine views', 1003, 720),
} as const
