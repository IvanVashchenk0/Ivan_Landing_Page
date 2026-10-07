export interface Vehicle {
  id: 'bolt' | 'prius' | 'civic'
  name: string
  fullName: string
  purchasePrice: number
  loanPayment: number
  loanTerm: number
  energyUnit: 'kwh-per-100-mi' | 'mpg'
  consumption: number
  energyMean: number
  energySD: number
  maintenanceMean: number
  maintenanceSD: number
  insuranceMean: number
  insuranceSD: number
  resalePercentage: number
}

export interface ModelAssumptions {
  mileage: number
  gasPrice: number
  electricityPrice: number
  years: number
  inflation: number
  discountRate: number
}

export const SIMULATIONS = 10000
export const DOWN_PAYMENT = 0.1
export const defaultAssumptions: ModelAssumptions = {
  mileage: 12000, gasPrice: 3.4, electricityPrice: 0.25,
  years: 8, inflation: 0.02, discountRate: 0.06,
}

export const vehicles: readonly Vehicle[] = [
  {
    id: 'bolt', name: 'BOLT EV', fullName: 'Chevrolet Bolt EV', purchasePrice: 20084.43,
    loanPayment: 4974.37, loanTerm: 5, energyUnit: 'kwh-per-100-mi', consumption: 28,
    energyMean: 0.25, energySD: 0.05, maintenanceMean: 400, maintenanceSD: 80,
    insuranceMean: 1400, insuranceSD: 280, resalePercentage: 0.3,
  },
  {
    id: 'prius', name: 'PRIUS', fullName: 'Toyota Prius HEV', purchasePrice: 30692.75,
    loanPayment: 6368.18, loanTerm: 5, energyUnit: 'mpg', consumption: 57,
    energyMean: 3.4, energySD: 0.68, maintenanceMean: 550, maintenanceSD: 110,
    insuranceMean: 1200, insuranceSD: 240, resalePercentage: 0.35,
  },
  {
    id: 'civic', name: 'CIVIC', fullName: 'Honda Civic LX', purchasePrice: 26326.25,
    loanPayment: 5447.21, loanTerm: 5, energyUnit: 'mpg', consumption: 36,
    energyMean: 3.4, energySD: 0.68, maintenanceMean: 600, maintenanceSD: 120,
    insuranceMean: 1100, insuranceSD: 220, resalePercentage: 0.4,
  },
]

// Controls shift the price means only; the supplied absolute SDs stay unchanged.
export function vehicleForModel(vehicle: Vehicle, model: ModelAssumptions): Vehicle {
  return { ...vehicle, energyMean: vehicle.energyUnit === 'mpg' ? model.gasPrice : model.electricityPrice }
}

export function validateModel(model: ModelAssumptions) {
  if (!Object.values(model).every(Number.isFinite)
    || model.mileage < 0 || model.mileage > 100000
    || model.gasPrice <= 0 || model.electricityPrice <= 0
    || !Number.isInteger(model.years) || model.years < 5 || model.years > 15
    || model.inflation < 0 || model.inflation > 1 || model.discountRate < 0 || model.discountRate > 1) {
    throw new RangeError('Use valid positive prices, 0–100,000 annual miles, and 5–15 ownership years.')
  }
}
