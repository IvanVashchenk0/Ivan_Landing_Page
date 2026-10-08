import { test, expect } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encodeGLB, parseGLB, repackGLB, repackFile, verifyRepack, jpegDimensions } from '../../scripts/media/lib/glb-repack.mjs'

function fixture() {
  const positions = Buffer.alloc(36)
  positions.writeFloatLE(1, 12); positions.writeFloatLE(1, 28)
  const indices = Buffer.alloc(12)
  indices.writeUInt32LE(1, 4); indices.writeUInt32LE(2, 8)
  return encodeGLB({ asset: { version: '2.0', extras: { preserve: 'yes' } }, buffers: [
    { byteLength: positions.length },
    { byteLength: 3, uri: 'data:application/octet-stream;base64,AQID' },
    { byteLength: indices.length, uri: 'data:application/octet-stream;base64,' + indices.toString('base64') },
  ], bufferViews: [{ buffer: 0, byteLength: 36 }, { buffer: 2, byteLength: 12 }], accessors: [
    { bufferView: 0, componentType: 5126, type: 'VEC3', count: 3 },
    { bufferView: 1, componentType: 5125, type: 'SCALAR', count: 3 },
  ], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }, { attributes: { POSITION: 0 }, indices: 1 }] }], nodes: [{ mesh: 0, translation: [1,2,3] }], scenes: [{ nodes: [0] }], scene: 0 }, positions)
}

test('binary repack preserves shared accessors, unused bytes, transforms and alignment', () => {
  const source = fixture(), output = repackGLB(source), report = verifyRepack(source, output)
  expect(report.counts.vertices).toBe(3)
  expect(report.counts.triangles).toBe(2)
  expect(report.geometryIdentical).toBe(true)
  const parsed = parseGLB(output)
  expect(parsed.buffers).toHaveLength(1)
  expect(parsed.json.bufferViews[1].byteOffset).toBe(40)
  expect(parsed.buffers[0].subarray(36,40)).toEqual(Buffer.from([1,2,3,0]))
  expect(repackGLB(source)).toEqual(output)
  const changed = Buffer.from(output); changed[changed.length-1] ^= 1
  expect(() => verifyRepack(source, changed)).toThrow('payload changed')
})

test('rejects malformed headers, chunks, data URIs, ranges and unsupported metadata', () => {
  const source = fixture()
  const badHeader = Buffer.from(source); badHeader.writeUInt32LE(1, 8)
  expect(() => parseGLB(badHeader)).toThrow('length mismatch')
  const badChunk = Buffer.from(source); badChunk.writeUInt32LE(5, 12)
  expect(() => parseGLB(badChunk)).toThrow('boundary')
  for (const mutate of [
    (g: any) => { g.buffers[1].uri = 'https://example.test/data.bin' },
    (g: any) => { g.buffers[1].uri = 'data:application/octet-stream;base64,A===' },
    (g: any) => { g.buffers[1].byteLength = 999 },
    (g: any) => { g.buffers[1].extras = { doNotLose: true } },
    (g: any) => { g.bufferViews[0].byteLength = 999 },
    (g: any) => { g.accessors[0].count = 999 },
    (g: any) => { g.extensionsUsed = ['EXT_meshopt_compression'] },
  ]) {
    const { json, buffers } = parseGLB(source); mutate(json)
    expect(() => repackGLB(encodeGLB(json, buffers[0]))).toThrow()
  }
})

test('repack refuses source or derivative overwrite and retains master bytes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pentimento-repack-'))
  try {
    const source = path.join(root,'source.glb'), output = path.join(root,'derivative.glb'), bytes = fixture()
    await writeFile(source, bytes)
    await expect(repackFile(source, source)).rejects.toThrow('overwrite source')
    await repackFile(source, output)
    await expect(repackFile(source, output)).rejects.toThrow('EEXIST')
    expect(await readFile(source)).toEqual(bytes)
  } finally { await rm(root, { recursive: true, force: true }) }
})


test('verification rejects material changes and reads JPEG dimensions without decoding pixels', () => {
  const source = fixture(), output = repackGLB(source), parsed = parseGLB(output)
  parsed.json.materials = [{ emissiveFactor: [0,0,0] }]
  expect(() => verifyRepack(source, encodeGLB(parsed.json, parsed.buffers[0]))).toThrow('Non-packaging JSON changed')
  // Minimal SOF marker for header inspection only; not used as rendered media.
  const header = Buffer.from([0xff,0xd8,0xff,0xc0,0,8,8,0x20,0,0x20,0,3])
  expect(jpegDimensions(header)).toEqual({ width:8192,height:8192 })
  expect(() => jpegDimensions(Buffer.from('not a JPEG'))).toThrow('Invalid JPEG')
})
