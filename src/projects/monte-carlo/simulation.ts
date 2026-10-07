import { summarize, type Summary } from './statistics'
import { DOWN_PAYMENT, SIMULATIONS, vehicles, vehicleForModel, validateModel, type ModelAssumptions, type Vehicle } from './vehicleData'

export interface TraceYear {
  year: number
  energyPrice: number
  maintenance: number
  insurance: number
  cashFlow: number
  discounted: number
  cumulativeNPV: number
}

export interface SimulationTrace {
  sample: number
  initialCashFlow: number
  years: TraceYear[]
  npv: number
}

export interface VehicleResult {
  vehicle: Vehicle
  outcomes: Float64Array
  statistics: Summary
  traces?: SimulationTrace[]
}

export interface MonteCarloResult {
  assumptions: ModelAssumptions
  vehicles: VehicleResult[]
  count: number
}

export function annualEnergyCost(vehicle: Vehicle, mileage: number, price: number): number {
  return vehicle.energyUnit === 'kwh-per-100-mi'
    ? mileage / 100 * vehicle.consumption * price
    : mileage / vehicle.consumption * price
}

export function discountedNPV(cashFlows: ArrayLike<number>, discountRate: number): number {
  let npv = 0
  for (let year = 0; year < cashFlows.length; year++) npv += cashFlows[year] / (1 + discountRate) ** year
  return npv
}

export function annualCashFlow(vehicle: Vehicle, model: ModelAssumptions, year: number, energyPrice: number, maintenance: number, insurance: number): number {
  const recurring = annualEnergyCost(vehicle, model.mileage, energyPrice) + maintenance + insurance
  const loan = year <= vehicle.loanTerm ? vehicle.loanPayment : 0
  const resale = year === model.years ? vehicle.purchasePrice * vehicle.resalePercentage : 0
  return -loan - recurring * (1 + model.inflation) ** (year - 1) + resale
}

// This model is linear in its uncertain inputs. Evaluating their means gives the
// exact expected NPV, so sensitivity does not inherit Monte Carlo sampling noise.
export function expectedNPV(vehicle: Vehicle, model: ModelAssumptions): number {
  const flows = [-vehicle.purchasePrice * DOWN_PAYMENT]
  for (let year = 1; year <= model.years; year++) {
    flows.push(annualCashFlow(vehicle, model, year, vehicle.energyMean, vehicle.maintenanceMean, vehicle.insuranceMean))
  }
  return discountedNPV(flows, model.discountRate)
}

// Paired Box–Muller draws. Preserve the source's untruncated normal assumptions:
// no silent clipping, new correlations, or synthetic Bayesian observations.
function normalSampler(random: () => number) {
  let spare: number | undefined
  return () => {
    if (spare !== undefined) { const value = spare; spare = undefined; return value }
    const radius = Math.sqrt(-2 * Math.log(1 - random()))
    const angle = 2 * Math.PI * random()
    spare = radius * Math.sin(angle)
    return radius * Math.cos(angle)
  }
}

export function simulateVehicle(vehicle: Vehicle, model: ModelAssumptions, count = SIMULATIONS, random = Math.random, traceCount = 0): VehicleResult {
  validateModel(model)
  if (!Number.isInteger(count) || count < 2 || count > 100000) throw new RangeError('Use 2–100,000 simulations.')
  if (!Number.isInteger(traceCount) || traceCount < 0 || traceCount > count) throw new RangeError('Trace count must be between zero and the sample count.')
  const normal = normalSampler(random)
  const outcomes = new Float64Array(count)
  const traces: SimulationTrace[] = []
  const initialCashFlow = -vehicle.purchasePrice * DOWN_PAYMENT
  const discounts = Array.from({ length: model.years }, (_, year) => (1 + model.discountRate) ** -(year + 1))
  for (let sample = 0; sample < count; sample++) {
    let npv = initialCashFlow
    const years: TraceYear[] | undefined = sample < traceCount ? [] : undefined
    for (let year = 1; year <= model.years; year++) {
      const energyPrice = vehicle.energyMean + vehicle.energySD * normal()
      const maintenance = vehicle.maintenanceMean + vehicle.maintenanceSD * normal()
      const insurance = vehicle.insuranceMean + vehicle.insuranceSD * normal()
      const cashFlow = annualCashFlow(vehicle, model, year, energyPrice, maintenance, insurance)
      const discounted = cashFlow * discounts[year - 1]
      npv += discounted
      years?.push({ year, energyPrice, maintenance, insurance, cashFlow, discounted, cumulativeNPV: npv })
    }
    outcomes[sample] = npv
    if (years) traces.push({ sample, initialCashFlow, years, npv })
  }
  return { vehicle, outcomes, statistics: summarize(outcomes), ...(traceCount ? { traces } : {}) }
}

export function runMonteCarlo(model: ModelAssumptions, count = SIMULATIONS, random = Math.random): MonteCarloResult {
  return { assumptions: { ...model }, count, vehicles: vehicles.map(vehicle => simulateVehicle(vehicleForModel(vehicle, model), model, count, random)) }
}
