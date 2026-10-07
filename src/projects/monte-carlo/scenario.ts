import { simulateVehicle } from './simulation'
import { defaultAssumptions, SIMULATIONS, vehicles, vehicleForModel } from './vehicleData'
import { percentile } from './statistics'
import { evaluateSensitivity } from './sensitivity'
import { compareDistributions, empiricalCDF } from './comparison'
import { histogramData } from './visualization'

export const demonstrationConfig = { seed: 460, count: SIMULATIONS, traceCount: 128, assumptions: { ...defaultAssumptions } } as const
export const vehicleLabels = ['BOLT EV', 'PRIUS HEV', 'CIVIC LX']
export function seededRandom(seed: number) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296 }
}
export function buildDemonstration() {
  const { assumptions, count, traceCount, seed } = demonstrationConfig
  const random = seededRandom(seed)
  const results = vehicles.map((vehicle, index) => {
    const result = simulateVehicle(vehicleForModel(vehicle, assumptions), assumptions, count, random, index === 0 ? traceCount : 0)
    const sorted = result.outcomes.slice().sort()
    return { ...result, sorted, cdf: empiricalCDF(sorted), median: percentile(sorted, .5), p95: percentile(sorted, .95) }
  })
  const bolt = results[0]
  const tail = bolt.sorted.filter(value => value <= bolt.statistics.var5)
  const comparisons = results.flatMap((left, i) => results.slice(i + 1).map((right, j) => {
    const forward = compareDistributions(left.outcomes, right.outcomes)
    const reverse = compareDistributions(right.outcomes, left.outcomes)
    const prefix = forward.firstOrder || forward.secondOrder ? vehicleLabels[i] : vehicleLabels[i + j + 1]
    const suffix = forward.firstOrder || forward.secondOrder ? vehicleLabels[i + j + 1] : vehicleLabels[i]
    const order = forward.firstOrder || reverse.firstOrder ? 'First-order' : forward.secondOrder || reverse.secondOrder ? 'Second-order only' : null
    return { pair: `${vehicleLabels[i]} / ${vehicleLabels[i + j + 1]}`, text: order ? `${prefix} → ${suffix}: ${order}` : `${vehicleLabels[i]} / ${vehicleLabels[i + j + 1]}: no dominance` }
  }))
  return { results, bolt, trace: bolt.traces![0], histogram: histogramData(results, 48), boltHistogram: histogramData([bolt], 48), tail, comparisons, sensitivity: evaluateSensitivity(bolt.vehicle, assumptions) }
}
export type Demonstration = ReturnType<typeof buildDemonstration>
let cached: Demonstration | undefined
export function getDemonstration() { return cached ??= buildDemonstration() }
