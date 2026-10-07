import { Box3, Group, Mesh, Vector3, type Object3D } from 'three'

/** Retain the entire imported hierarchy; only the new parent is translated. */
export function prepareCustomGLBShell(importedScene: Object3D): Group {
  let hasGeometry = false
  importedScene.traverse(object => {
    if (object instanceof Mesh && object.geometry.getAttribute('position')?.count > 0) hasGeometry = true
  })
  const nativeBounds = new Box3().setFromObject(importedScene)
  const size = nativeBounds.getSize(new Vector3())
  if (!hasGeometry || nativeBounds.isEmpty() || ![...nativeBounds.min, ...nativeBounds.max].every(Number.isFinite) || size.length() === 0) {
    throw new Error('The GLB contains no viewable mesh geometry.')
  }

  const shell = new Group()
  shell.name = 'Pentimento reconstruction'
  shell.userData.nativeBounds = { min: nativeBounds.min.toArray(), max: nativeBounds.max.toArray() }
  shell.position.copy(nativeBounds.getCenter(new Vector3())).negate()
  shell.add(importedScene)
  // Default scale stays (1, 1, 1). Never flatten, merge, center vertices, or normalize materials.
  return shell
}
