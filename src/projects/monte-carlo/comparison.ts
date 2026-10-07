// Exact empirical CDFs on pooled support, including ties. NPV is higher-is-better.
export function compareDistributions(a: ArrayLike<number>, b: ArrayLike<number>) {
  if (!a.length || !b.length) throw new RangeError('Two nonempty samples are required.')
  const left = Array.from(a).sort((x, y) => x - y)
  const right = Array.from(b).sort((x, y) => x - y)
  if (![...left, ...right].every(Number.isFinite)) throw new RangeError('Samples must be finite.')
  const knots = Array.from(new Set([...left, ...right])).sort((x, y) => x - y)
  let i = 0, j = 0, difference = 0, integral = 0
  let first = true, second = true, firstStrict = false, secondStrict = false
  let previous = knots[0]
  for (const x of knots) {
    // CDFs are constant between sample values; integrate BEFORE updating counts.
    integral += difference * (x - previous)
    if (integral > 1e-8) second = false
    if (integral < -1e-8) secondStrict = true
    while (i < left.length && left[i] <= x) i++
    while (j < right.length && right[j] <= x) j++
    difference = i / left.length - j / right.length
    if (difference > 1e-12) first = false
    if (difference < -1e-12) firstStrict = true
    previous = x
  }
  return { firstOrder: first && firstStrict, secondOrder: second && secondStrict }
}

export function empiricalCDF(sorted: Float64Array) {
  const points: { x: number; probability: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i === sorted.length - 1 || sorted[i] !== sorted[i + 1]) points.push({ x: sorted[i], probability: (i + 1) / sorted.length })
  }
  return points
}
