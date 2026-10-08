import { localMedia, mediaUrl } from '../../data/media/config'

export const IMAGE_RECOGNITION_PIPELINE_VIDEO = mediaUrl('image-recognition.full-pipeline')
export const IMAGE_RECOGNITION_SIMILARITY_VIDEO = mediaUrl('image-recognition.similarity')
export const IMAGE_RECOGNITION_CONCURRENT_VIDEO = mediaUrl('image-recognition.concurrent-processing')

const local = (name: string) => localMedia(`media/projects/image-recognition/${name}`)

export const IMAGE_RECOGNITION_PIPELINE_POSTER = local('full-pipeline-poster.jpg')
export const IMAGE_RECOGNITION_SIMILARITY_POSTER = local('similarity-poster.jpg')
export const IMAGE_RECOGNITION_CONCURRENT_POSTER = local('over-write-poster.jpg')
export const IMAGE_RECOGNITION_BLUR_DIAGRAM = local('blur-diagram.webp')
export const IMAGE_RECOGNITION_BLUR_STAGES = [
  'Original photograph',
  'Grayscale analytical view',
  'Canny edge detection',
  'Region grid',
  'Edge-rich region measurements',
  'Raw blur value',
  'Normalized blur value',
  'Ranked image comparison',
].map((title, index) => ({ title, src: local(`blur-stage-${index + 1}.webp`) }))
