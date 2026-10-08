import { localMedia, mediaUrl } from '../../data/media/config'

export const AHU_PREVIEW_VIDEO = mediaUrl('ahu.preview')
export const AHU_SCANNING_VIDEO = mediaUrl('ahu.scanning')
export const AHU_MODEL_GENERATION_VIDEO = mediaUrl('ahu.model-generation')
export const AHU_APPLICATION_VIDEO = mediaUrl('ahu.application')
export const AHU_ENGINEERING_OUTPUT_VIDEO = mediaUrl('ahu.engineering-output')
export const AHU_COMPLETE_PIPELINE_VIDEO = mediaUrl('ahu.complete-pipeline')

const poster = (name: string) => localMedia(`media/projects/ahu-digitalization/${name}-poster.jpg`)

export const AHU_PREVIEW_POSTER = poster('preview')
export const AHU_SCANNING_POSTER = poster('scanning')
export const AHU_MODEL_GENERATION_POSTER = poster('model-generation')
export const AHU_APPLICATION_POSTER = poster('application')
export const AHU_ENGINEERING_OUTPUT_POSTER = poster('engineering-output')
export const AHU_COMPLETE_PIPELINE_POSTER = poster('complete-pipeline')
