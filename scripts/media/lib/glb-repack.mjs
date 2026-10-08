import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const align = n => Math.ceil(n / 4) * 4
const integer = n => Number.isSafeInteger(n) && n >= 0
function check(condition, message) { if (!condition) throw new Error(message) }

/** Deliberately restricted to uncompressed GLB 2.0 with embedded buffers. Fail closed. */
export function parseGLB(bytes) {
  check(bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2, 'Invalid GLB 2.0 header')
  check(bytes.readUInt32LE(8) === bytes.length, 'GLB length mismatch')
  const chunks = []
  for (let offset = 12; offset < bytes.length;) {
    check(offset + 8 <= bytes.length, 'Truncated chunk header')
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4)
    check(length % 4 === 0 && offset + 8 + length <= bytes.length, 'Invalid chunk boundary/alignment')
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) })
    offset += 8 + length
  }
  check(chunks.length === 2 && chunks[0].type === 0x4e4f534a && chunks[1].type === 0x004e4942, 'Expected exactly JSON and BIN chunks; unknown chunks are not discarded')
  const json = JSON.parse(chunks[0].bytes.toString('utf8'))
  check(json.asset?.version === '2.0' && Array.isArray(json.buffers), 'Unsupported glTF document')
  check((json.extensionsUsed ?? []).every(e => e === 'KHR_materials_unlit'), 'Unsupported extension: requires a preservation audit')
  const buffers = json.buffers.map((buffer, i) => {
    check(Object.keys(buffer).every(k => ['byteLength', 'uri'].includes(k)), 'Buffer metadata cannot be merged losslessly; unsupported')
    check(integer(buffer.byteLength), 'Invalid buffer length')
    let result
    if (buffer.uri !== undefined) {
      const match = /^data:application\/(?:octet-stream|gltf-buffer);base64,([A-Za-z0-9+/]*={0,2})$/.exec(buffer.uri)
      check(match && match[1].length % 4 === 0, 'Unsupported or malformed data URI')
      result = Buffer.from(match[1], 'base64')
      check(result.toString('base64') === match[1], 'Noncanonical/invalid base64')
    } else {
      check(i === 0 && chunks[1].bytes.length >= buffer.byteLength && chunks[1].bytes.length - buffer.byteLength <= 3, 'Invalid BIN buffer length/reference')
      check(chunks[1].bytes.subarray(buffer.byteLength).every(byte => byte === 0), 'Nonzero BIN padding would be discarded')
      result = chunks[1].bytes.subarray(0, buffer.byteLength)
    }
    check(result.length === buffer.byteLength, 'Decoded buffer length mismatch')
    return result
  })
  check(json.buffers[0]?.uri === undefined, 'Unreferenced BIN chunk is unsupported')
  for (const view of json.bufferViews ?? []) {
    const offset = view.byteOffset ?? 0
    check(integer(view.buffer) && buffers[view.buffer] && integer(offset) && integer(view.byteLength) && offset + view.byteLength <= buffers[view.buffer].length, 'bufferView outside buffer')
    check(!view.extensions, 'Extended bufferViews require a preservation audit')
  }
  for (const accessor of json.accessors ?? []) {
    check(!accessor.sparse && !accessor.extensions, 'Sparse/extended accessors are unsupported')
    const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
    const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
    const size = sizes[accessor.componentType], width = widths[accessor.type]
    const view = json.bufferViews?.[accessor.bufferView], offset = accessor.byteOffset ?? 0
    check(size && width && view && integer(accessor.count) && integer(offset), 'Unsupported accessor')
    const stride = view.byteStride ?? size * width
    check(integer(stride) && stride >= size * width && stride % size === 0 && offset % size === 0 && ((view.byteOffset ?? 0) + offset) % size === 0, 'Invalid accessor alignment/stride')
    check(offset + (accessor.count ? (accessor.count - 1) * stride + size * width : 0) <= view.byteLength, 'Accessor outside bufferView')
  }
  for (const image of json.images ?? []) check(image.uri === undefined && json.bufferViews?.[image.bufferView] && image.mimeType === 'image/jpeg', 'Only embedded JPEG bufferView images supported')
  return { json, buffers, jsonBytes: chunks[0].bytes.length, binBytes: chunks[1].bytes.length }
}

export function encodeGLB(json, binary) {
  const text = Buffer.from(JSON.stringify(json))
  const jsonChunk = Buffer.alloc(align(text.length), 0x20); text.copy(jsonChunk)
  const binChunk = Buffer.alloc(align(binary.length)); binary.copy(binChunk)
  const result = Buffer.alloc(28 + jsonChunk.length + binChunk.length)
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8)
  result.writeUInt32LE(jsonChunk.length, 12); result.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(result, 20)
  result.writeUInt32LE(binChunk.length, 20 + jsonChunk.length); result.writeUInt32LE(0x004e4942, 24 + jsonChunk.length); binChunk.copy(result, 28 + jsonChunk.length)
  return result
}

export function repackGLB(bytes) {
  const source = parseGLB(bytes), offsets = []
  let length = 0
  for (const buffer of source.buffers) { length = align(length); offsets.push(length); length += buffer.length }
  const binary = Buffer.alloc(length)
  source.buffers.forEach((buffer, i) => buffer.copy(binary, offsets[i]))
  const json = structuredClone(source.json)
  json.buffers = [{ byteLength: binary.length }]
  for (const view of json.bufferViews ?? []) {
    view.byteOffset = offsets[view.buffer] + (view.byteOffset ?? 0)
    view.buffer = 0
  }
  return encodeGLB(json, binary)
}

function viewBytes(parsed, index) {
  const view = parsed.json.bufferViews[index]
  return parsed.buffers[view.buffer].subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
}
function accessorBytes(parsed, accessor) {
  const view = parsed.json.bufferViews[accessor.bufferView], bytes = viewBytes(parsed, accessor.bufferView)
  const size = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType] * { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type]
  const stride = view.byteStride ?? size, start = accessor.byteOffset ?? 0
  if (stride === size) return bytes.subarray(start, start + accessor.count * size)
  const packed = Buffer.alloc(accessor.count * size)
  for (let i = 0; i < accessor.count; i++) bytes.copy(packed, i * size, start + i * stride, start + i * stride + size)
  return packed
}
export function jpegDimensions(bytes) {
  check(bytes[0] === 0xff && bytes[1] === 0xd8, 'Invalid JPEG SOI')
  let offset = 2
  while (offset + 4 <= bytes.length) {
    check(bytes[offset++] === 0xff, 'Invalid JPEG marker')
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9) break
    const length = bytes.readUInt16BE(offset)
    check(length >= 2 && offset + length <= bytes.length, 'Invalid JPEG segment')
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      check(length >= 8, 'Invalid JPEG frame')
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) }
    }
    offset += length
  }
  throw new Error('JPEG dimensions not found')
}

/** Byte comparisons, not tolerances: includes unreferenced bytes inside source buffers. */
export function verifyRepack(sourceBytes, outputBytes) {
  const source = parseGLB(sourceBytes), output = parseGLB(outputBytes)
  check(output.buffers.length === 1 && output.json.buffers[0].uri === undefined, 'Derivative is not binary-only')
  let offset = 0
  for (const buffer of source.buffers) {
    const next = align(offset)
    check(output.buffers[0].subarray(offset, next).every(byte => byte === 0), 'Unexpected alignment bytes')
    offset = next
    check(buffer.equals(output.buffers[0].subarray(offset, offset + buffer.length)), 'Original buffer payload changed')
    offset += buffer.length
  }
  check(offset === output.buffers[0].length, 'Unexpected extra payload')
  const normalized = parsed => {
    const json = structuredClone(parsed.json)
    delete json.buffers
    for (const view of json.bufferViews ?? []) { delete view.buffer; delete view.byteOffset }
    return json
  }
  assert.deepStrictEqual(normalized(output), normalized(source), 'Non-packaging JSON changed')
  source.json.bufferViews.forEach((_, i) => check(viewBytes(source, i).equals(viewBytes(output, i)), `bufferView ${i} changed`))
  const accessors = source.json.accessors.map((accessor, i) => {
    const bytes = accessorBytes(source, accessor)
    check(bytes.equals(accessorBytes(output, output.json.accessors[i])), `Accessor ${i} changed`)
    return { index: i, count: accessor.count, type: accessor.type, componentType: accessor.componentType, bytes: bytes.length, sha256: sha256(bytes), identical: true }
  })
  const images = (source.json.images ?? []).map((image, i) => {
    const a = viewBytes(source, image.bufferView), b = viewBytes(output, output.json.images[i].bufferView)
    check(a.equals(b), `JPEG ${i} changed; STOP`)
    return { index: i, bytes: a.length, sha256: sha256(a), ...jpegDimensions(a), identical: true }
  })
  const primitives = (source.json.meshes ?? []).flatMap(mesh => mesh.primitives)
  const positions = new Set(primitives.map(p => p.attributes.POSITION))
  const base64Expansion = source.json.buffers.reduce((sum, buffer, i) => sum + (buffer.uri ? buffer.uri.split(',')[1].length - source.buffers[i].length : 0), 0)
  return {
    source: { bytes: sourceBytes.length, sha256: sha256(sourceBytes) }, derivative: { bytes: outputBytes.length, sha256: sha256(outputBytes) },
    reductionBytes: sourceBytes.length - outputBytes.length, reductionPercent: (1 - outputBytes.length / sourceBytes.length) * 100,
    packaging: { base64ExpansionRemoved: base64Expansion, sourceJsonBytes: source.jsonBytes, derivativeJsonBytes: output.jsonBytes, derivativeBinBytes: output.binBytes, decodedPayloadBytes: source.buffers.reduce((n,b) => n + b.length, 0), alignmentBytes: output.binBytes - source.buffers.reduce((n,b) => n + b.length, 0) },
    counts: { vertices: [...positions].reduce((n,i) => n + source.json.accessors[i].count, 0), triangles: primitives.reduce((n,p) => { check((p.mode ?? 4) === 4 && p.indices !== undefined, 'Expected indexed triangles'); return n + source.json.accessors[p.indices].count / 3 },0), primitives: primitives.length, materials: source.json.materials?.length ?? 0, meshes: source.json.meshes?.length ?? 0, nodes: source.json.nodes?.length ?? 0, images: images.length },
    geometryIdentical: true, jpegBytesIdentical: true, nonPackagingJSONIdentical: true, accessors, images,
  }
}

export async function repackFile(sourcePath, outputPath) {
  check(path.resolve(sourcePath) !== path.resolve(outputPath), 'Cannot overwrite source')
  const source = await readFile(sourcePath)
  const output = repackGLB(source)
  const report = verifyRepack(source, output)
  await writeFile(outputPath, output, { flag: 'wx' })
  check(sha256(await readFile(sourcePath)) === report.source.sha256, 'Master changed during operation')
  check(sha256(await readFile(outputPath)) === report.derivative.sha256, 'Derivative write verification failed')
  return report
}
