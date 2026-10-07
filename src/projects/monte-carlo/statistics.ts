type Values = ArrayLike<number>

export function mean(values: Values): number {
  if (!values.length) throw new RangeError('At least one outcome is required.')
  let sum = 0
  for (let i = 0; i < values.length; i++) sum += values[i]
  return sum / values.length
}

export function standardDeviation(values: Values): number {
  if (values.length < 2) return 0
  const average = mean(values)
  let squared = 0
  for (let i = 0; i < values.length; i++) squared += (values[i] - average) ** 2
  return Math.sqrt(squared / (values.length - 1))
}

// Linear interpolation at (n − 1)p, matching NumPy's default percentile method.
export function percentile(sortedValues: Values, probability: number): number {
  if (!sortedValues.length || !Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError('A sorted sample and probability from 0 to 1 are required.')
  }
  const position = (sortedValues.length - 1) * probability
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower)
}

export function valueAtRisk(sortedValues: Values, alpha = 0.05): number {
  return percentile(sortedValues, alpha)
}

export function conditionalValueAtRisk(sortedValues: Values, alpha = 0.05): number {
  const threshold = valueAtRisk(sortedValues, alpha)
  let sum = 0
  let count = 0
  for (let i = 0; i < sortedValues.length && sortedValues[i] <= threshold; i++) {
    sum += sortedValues[i]
    count++
  }
  return sum / count
}

export function summarize(outcomes: Float64Array) {
  const sorted = outcomes.slice().sort()
  return {
    mean: mean(outcomes), standardDeviation: standardDeviation(outcomes),
    var5: valueAtRisk(sorted), cvar5: conditionalValueAtRisk(sorted),
    min: sorted[0], max: sorted[sorted.length - 1],
  }
}

export type Summary = ReturnType<typeof summarize>
