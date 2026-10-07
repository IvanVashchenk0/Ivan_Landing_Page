import { expectedNPV } from './simulation'
import type { ModelAssumptions, Vehicle } from './vehicleData'

export interface SensitivityDriver {
  key: string
  label: string
  lowDelta: number
  highDelta: number
  impact: number
}

export function evaluateSensitivity(vehicle: Vehicle, model: ModelAssumptions): SensitivityDriver[] {
  const baseline = expectedNPV(vehicle, model)
  const drivers = [
    { key: 'energyMean', label: vehicle.energyUnit === 'mpg' ? 'Gas price' : 'Electricity price' },
    { key: 'maintenanceMean', label: 'Maintenance' },
    { key: 'insuranceMean', label: 'Insurance' },
    { key: 'resalePercentage', label: 'Resale percentage' },
  ] as const
  return drivers.map(({ key, label }) => {
    const lowDelta = expectedNPV({ ...vehicle, [key]: vehicle[key] * 0.9 }, model) - baseline
    const highDelta = expectedNPV({ ...vehicle, [key]: vehicle[key] * 1.1 }, model) - baseline
    return { key, label, lowDelta, highDelta, impact: Math.max(Math.abs(lowDelta), Math.abs(highDelta)) }
  }).sort((a, b) => b.impact - a.impact)
}
