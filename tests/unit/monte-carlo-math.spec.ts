import { expect, test } from '@playwright/test'
import { annualEnergyCost, annualCashFlow, discountedNPV, expectedNPV, runMonteCarlo, simulateVehicle } from '../../src/projects/monte-carlo/simulation'
import { defaultAssumptions, vehicles, vehicleForModel } from '../../src/projects/monte-carlo/vehicleData'
import { mean, standardDeviation, percentile, valueAtRisk, conditionalValueAtRisk } from '../../src/projects/monte-carlo/statistics'
import { evaluateSensitivity } from '../../src/projects/monte-carlo/sensitivity'
import { histogramData } from '../../src/projects/monte-carlo/visualization'

function seededRandom(seed: number) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296 }
}

test('EV and gasoline energy costs use their distinct consumption units', () => {
  expect(annualEnergyCost(vehicles[0], 12000, 0.25)).toBe(840)
  expect(annualEnergyCost(vehicles[1], 12000, 3.4)).toBeCloseTo(715.7894736842, 8)
  expect(annualEnergyCost(vehicles[2], 12000, 3.4)).toBeCloseTo(1133.3333333333, 8)
  expect(annualEnergyCost(vehicles[0], 0, 0.25)).toBe(0)
})

test('discounting includes year zero; loan, inflation and terminal resale use correct years', () => {
  expect(discountedNPV([-100, -106, 112.36], 0.06)).toBeCloseTo(-100, 10)
  const vehicle = vehicles[0]
  const recurring = 840 + 400 + 1400
  expect(annualCashFlow(vehicle, defaultAssumptions, 1, 0.25, 400, 1400)).toBeCloseTo(-4974.37 - recurring, 8)
  expect(annualCashFlow(vehicle, defaultAssumptions, 5, 0.25, 400, 1400)).toBeCloseTo(-4974.37 - recurring * 1.02 ** 4, 8)
  expect(annualCashFlow(vehicle, defaultAssumptions, 6, 0.25, 400, 1400)).toBeCloseTo(-recurring * 1.02 ** 5, 8)
  expect(annualCashFlow(vehicle, defaultAssumptions, 8, 0.25, 400, 1400)).toBeCloseTo(-recurring * 1.02 ** 7 + 20084.43 * 0.3, 8)
})

test('zero uncertainty matches an independently evaluated present-worth calculation', () => {
  for (const years of [5, 8, 15]) {
    const model = { ...defaultAssumptions, years }
    const vehicle = { ...vehicles[0], energySD: 0, maintenanceSD: 0, insuranceSD: 0 }
    const discount = 1.06
    const recurringPV = (840 + 400 + 1400) / discount * (1 - (1.02 / discount) ** years) / (1 - 1.02 / discount)
    const loanPV = 4974.37 * (1 - discount ** -5) / 0.06
    const expected = -20084.43 * 0.1 - recurringPV - loanPV + 20084.43 * 0.3 / discount ** years
    expect(expectedNPV(vehicle, model)).toBeCloseTo(expected, 7)
    const result = simulateVehicle(vehicle, model, 10, seededRandom(1))
    expect(result.outcomes[0]).toBeCloseTo(expected, 7)
    expect(result.statistics.standardDeviation).toBeCloseTo(0, 7)
    expect(result.statistics.cvar5).toBeCloseTo(expected, 7)
  }
})

test('percentile interpolates and CVaR averages the lower tail including threshold ties', () => {
  const sample = [-100, -80, -60, -40, -20]
  expect(mean(sample)).toBe(-60)
  expect(standardDeviation(sample)).toBeCloseTo(Math.sqrt(1000), 10)
  expect(percentile(sample, 0)).toBe(-100)
  expect(percentile(sample, 1)).toBe(-20)
  expect(percentile(sample, 0.5)).toBe(-60)
  expect(valueAtRisk(sample)).toBe(-96)
  expect(conditionalValueAtRisk(sample)).toBe(-100)
  expect(conditionalValueAtRisk([-100, -80, -80, -40], 0.5)).toBeCloseTo(-260 / 3, 10)
  expect(conditionalValueAtRisk([10, 10, 10])).toBe(10)
  expect(() => percentile([], 0.5)).toThrow(RangeError)
})

test('10,000 real outcomes per vehicle recover the analytic mean and uncertainty', () => {
  const result = runMonteCarlo(defaultAssumptions, 10000, seededRandom(42))
  expect(result.vehicles).toHaveLength(3)
  for (const { vehicle, outcomes, statistics } of result.vehicles) {
    expect(outcomes.length).toBe(10000)
    expect(outcomes.every(Number.isFinite)).toBe(true)
    expect(Object.values(statistics).every(Number.isFinite)).toBe(true)
    const annualVariance = annualEnergyCost(vehicle, defaultAssumptions.mileage, vehicle.energySD) ** 2 + vehicle.maintenanceSD ** 2 + vehicle.insuranceSD ** 2
    const variance = annualVariance * Array.from({ length: 8 }, (_, year) => (1.02 ** year / 1.06 ** (year + 1)) ** 2).reduce((a, b) => a + b, 0)
    const expectedSD = Math.sqrt(variance)
    expect(Math.abs(statistics.mean - expectedNPV(vehicle, defaultAssumptions))).toBeLessThan(5 * expectedSD / 100)
    expect(Math.abs(statistics.standardDeviation / expectedSD - 1)).toBeLessThan(0.04)
    expect(statistics.cvar5).toBeLessThan(statistics.var5)
    expect(statistics.var5).toBeLessThan(statistics.mean)
  }
  const histogram = histogramData(result.vehicles)
  for (const series of histogram.series) expect(series.bins.reduce((a, b) => a + b, 0)).toBe(10000)
  expect(runMonteCarlo(defaultAssumptions, 10, seededRandom(43)).vehicles[0].outcomes[0]).not.toBe(result.vehicles[0].outcomes[0])
})

test('sensitivity ranks exact expected effects and uses relative resale changes', () => {
  const drivers = evaluateSensitivity(vehicles[0], defaultAssumptions)
  expect(drivers.map(driver => driver.key)).toEqual(['insuranceMean', 'energyMean', 'resalePercentage', 'maintenanceMean'])
  for (const driver of drivers) expect(driver.lowDelta).toBeCloseTo(-driver.highDelta, 7)
  const resale = drivers.find(driver => driver.key === 'resalePercentage')!
  expect(resale.highDelta).toBeCloseTo(20084.43 * 0.3 * 0.1 / 1.06 ** 8, 7)
  const insurance = drivers[0]
  expect(insurance.highDelta).toBeLessThan(0)
  const highMileage = { ...defaultAssumptions, mileage: 50000 }
  expect(evaluateSensitivity(vehicles[0], highMileage)[0].key).toBe('energyMean')
})

test('price controls shift means without changing source standard deviations', () => {
  const changed = { ...defaultAssumptions, gasPrice: 5, electricityPrice: 0.4 }
  expect(vehicleForModel(vehicles[0], changed).energyMean).toBe(0.4)
  expect(vehicleForModel(vehicles[1], changed).energyMean).toBe(5)
  expect(vehicleForModel(vehicles[0], changed).energySD).toBe(0.05)
  expect(vehicleForModel(vehicles[1], changed).energySD).toBe(0.68)
  expect(() => runMonteCarlo({ ...changed, years: NaN })).toThrow(RangeError)
  expect(() => runMonteCarlo(changed, 0)).toThrow(RangeError)
})
