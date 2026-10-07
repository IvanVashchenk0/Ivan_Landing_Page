import { useId, useState } from 'react'
import type { MonteCarloResult } from './simulation'
import { evaluateSensitivity } from './sensitivity'
import { currency } from './visualization'

export function SensitivityChart({ result }: { result: MonteCarloResult }) {
  const id = useId()
  const [selected, setSelected] = useState(0)
  const vehicle = result.vehicles[selected].vehicle
  const drivers = evaluateSensitivity(vehicle, result.assumptions)
  const max = Math.max(...drivers.map(driver => driver.impact), 1)
  const signed = (value: number) => `${value > 0 ? '+' : ''}${currency(value)}`
  return <div className="futures-sensitivity">
    <div className="futures-sensitivity-heading">
      <div className="futures-vehicle-picker" role="group" aria-label="Sensitivity vehicle">
        {result.vehicles.map(({ vehicle }, index) => <button key={vehicle.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>{vehicle.name}</button>)}
      </div>
      <span className="mono">±10% INPUT / CHANGE IN EXPECTED NPV</span>
    </div>
    <div className="futures-tornado" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <span className="sr-only" id={`${id}-title`}>{vehicle.fullName} sensitivity ranking</span>
      <span className="sr-only" id={`${id}-description`}>{drivers.map(driver => `${driver.label}: minus 10% changes NPV by ${signed(driver.lowDelta)}, plus 10% by ${signed(driver.highDelta)}.`).join(' ')}</span>
      {drivers.map(driver => <div className="futures-tornado-row" key={driver.key} aria-hidden="true">
        <span>{driver.label}</span>
        <span className="futures-tornado-negative mono">{signed(Math.min(driver.lowDelta, driver.highDelta))}</span>
        <div className="futures-tornado-track">
          {[{ value: driver.lowDelta, side: 'low' }, { value: driver.highDelta, side: 'high' }].map(({ value, side }) => <i key={side} className={`futures-impact-${side}`} style={{ left: `${value < 0 ? 50 - Math.abs(value) / max * 50 : 50}%`, width: `${Math.abs(value) / max * 50}%` }} />)}
        </div>
        <span className="futures-tornado-positive mono">{signed(Math.max(driver.lowDelta, driver.highDelta))}</span>
      </div>)}
    </div>
    <div className="futures-sensitivity-legend mono"><span><i />−10% input</span><span><i />+10% input</span><span>LOWER COST →</span></div>
  </div>
}
