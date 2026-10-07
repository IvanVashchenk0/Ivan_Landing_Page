import { expect, test } from '@playwright/test'
import { buildDemonstration, getDemonstration, seededRandom } from '../../src/projects/monte-carlo/scenario'
import { annualCashFlow, discountedNPV, simulateVehicle } from '../../src/projects/monte-carlo/simulation'
import { defaultAssumptions, vehicles } from '../../src/projects/monte-carlo/vehicleData'
import { compareDistributions, empiricalCDF } from '../../src/projects/monte-carlo/comparison'
import { frameAt, timeline, TOTAL_DURATION } from '../../src/projects/monte-carlo/timeline'

test('captured samples reconcile draws, annual cash flows and every discounted contribution', () => {
  const result = simulateVehicle(vehicles[0], defaultAssumptions, 10000, seededRandom(460), 128)
  const untraced = simulateVehicle(vehicles[0], defaultAssumptions, 10000, seededRandom(460))
  expect(result.outcomes).toEqual(untraced.outcomes)
  expect(untraced.traces).toBeUndefined()
  expect(result.traces).toHaveLength(128)
  for (const trace of result.traces!) {
    expect(trace.initialCashFlow).toBe(-vehicles[0].purchasePrice * .1)
    let sum = trace.initialCashFlow
    for (const year of trace.years) {
      expect(year.cashFlow).toBe(annualCashFlow(vehicles[0], defaultAssumptions, year.year, year.energyPrice, year.maintenance, year.insurance))
      expect(year.discounted).toBeCloseTo(year.cashFlow / 1.06 ** year.year, 8)
      sum += year.discounted
      expect(year.cumulativeNPV).toBe(sum)
    }
    expect(sum).toBe(trace.npv)
    expect(trace.npv).toBe(result.outcomes[trace.sample])
    expect(trace.npv).toBeCloseTo(discountedNPV([trace.initialCashFlow, ...trace.years.map(year => year.cashFlow)], .06), 8)
  }
  expect(() => simulateVehicle(vehicles[0], defaultAssumptions, 10, seededRandom(1), 11)).toThrow(RangeError)
})

test('demonstration is reproducible, conserves full samples, and uses exact tail membership', () => {
  const a = buildDemonstration(), b = buildDemonstration()
  expect(a.results.map(result => result.outcomes)).toEqual(b.results.map(result => result.outcomes))
  expect(getDemonstration()).toBe(getDemonstration())
  for (const result of a.results) {
    expect(result.outcomes).toHaveLength(10000)
    expect(result.statistics.var5).toBeLessThan(result.median)
    expect(result.median).toBeLessThan(result.p95)
    expect(result.cdf.at(-1)?.probability).toBe(1)
  }
  for (const h of [a.histogram, a.boltHistogram]) for (const series of h.series) expect(series.bins.reduce((a, b) => a + b, 0)).toBe(10000)
  expect(a.tail).toEqual(a.bolt.sorted.filter(value => value <= a.bolt.statistics.var5))
  expect(a.tail.reduce((a, b) => a + b, 0) / a.tail.length).toBe(a.bolt.statistics.cvar5)
  expect(a.sensitivity[0].key).toBe('insuranceMean')
})

test('dominance checks all empirical breakpoints and all prefix integrals', () => {
  expect(compareDistributions([1, 2], [1, 2])).toEqual({ firstOrder: false, secondOrder: false })
  expect(compareDistributions([2, 3], [0, 1])).toEqual({ firstOrder: true, secondOrder: true })
  expect(compareDistributions([0, 1], [2, 3])).toEqual({ firstOrder: false, secondOrder: false })
  expect(compareDistributions([0, 0], [-1, 1])).toEqual({ firstOrder: false, secondOrder: true })
  // A has a better mean, but its CDF integral starts ABOVE B's: total area is insufficient.
  expect(compareDistributions([-2, 5], [0, 1])).toEqual({ firstOrder: false, secondOrder: false })
  expect(compareDistributions([0, 1], [-2, 5])).toEqual({ firstOrder: false, secondOrder: false })
  expect(compareDistributions([2, 2, 3], [1, 1, 2]).firstOrder).toBe(true)
  expect(empiricalCDF(new Float64Array([1, 1, 2]))).toEqual([{ x: 1, probability: 2 / 3 }, { x: 2, probability: 1 }])
  expect(() => compareDistributions([], [1])).toThrow(RangeError)
  expect(() => compareDistributions([NaN], [1])).toThrow(RangeError)
})

test('fourteen contiguous scenes resolve into a held framework at 49 seconds', () => {
  expect(TOTAL_DURATION).toBe(49000)
  expect(timeline.map(scene => scene.id)).toEqual(['SETUP', 'INPUTS', 'ONE_FUTURE', 'FULL_PATH', 'DISCOUNT', 'REPEAT', 'HISTOGRAM', 'ANATOMY', 'VAR', 'CVAR', 'VEHICLES', 'COMPARISON', 'SENSITIVITY', 'FRAMEWORK'])
  for (const scene of timeline) {
    expect(frameAt(scene.start).scene.id).toBe(scene.id)
    expect(frameAt(scene.start + scene.duration - 1).scene.id).toBe(scene.id)
  }
  expect(frameAt(-1).scene.id).toBe('SETUP')
  expect(frameAt(99000).scene.id).toBe('FRAMEWORK')
  expect(frameAt(99000).progress).toBe(1)
})
