import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Arrow } from '../../components/ui/Arrow'
import { DistributionChart } from './DistributionChart'
import { SensitivityChart } from './SensitivityChart'
import { simulateVehicle, type MonteCarloResult, type VehicleResult } from './simulation'
import { defaultAssumptions, SIMULATIONS, vehicles, vehicleForModel, validateModel } from './vehicleData'
import { currency } from './visualization'
import './styles.css'

const defaultInputs = {
  mileage: String(defaultAssumptions.mileage), gasPrice: String(defaultAssumptions.gasPrice),
  electricityPrice: String(defaultAssumptions.electricityPrice), years: String(defaultAssumptions.years),
}
const fields = [
  { key: 'mileage', label: 'ANNUAL MILEAGE', unit: 'mi / year', min: 0, max: 100000, step: 1000 },
  { key: 'gasPrice', label: 'GAS PRICE', unit: '$ / gallon', min: 0.01, max: 20, step: 0.01 },
  { key: 'electricityPrice', label: 'ELECTRICITY PRICE', unit: '$ / kWh', min: 0.01, max: 5, step: 0.01 },
  { key: 'years', label: 'OWNERSHIP PERIOD', unit: 'years', min: 5, max: 15, step: 1 },
] as const
const yieldToBrowser = () => new Promise<void>(resolve => window.setTimeout(resolve, 0))

export default function MonteCarlo() {
  const id = useId()
  const [inputs, setInputs] = useState(defaultInputs)
  const [result, setResult] = useState<MonteCarloResult | null>(null)
  const [runs, setRuns] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [sensitivity, setSensitivity] = useState(false)
  const runToken = useRef(0)
  useEffect(() => () => { runToken.current++ }, [])
  const stale = !!result && fields.some(({ key }) => Number(inputs[key]) !== result.assumptions[key] || inputs[key] === '')

  const run = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (running) return
    const token = ++runToken.current
    setRunning(true)
    setError('')
    const model = { ...defaultAssumptions, ...Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Number(value)])) }
    const started = performance.now()
    try {
      validateModel(model)
      const results: VehicleResult[] = []
      for (const vehicle of vehicles) {
        await yieldToBrowser()
        if (runToken.current !== token) return
        results.push(simulateVehicle(vehicleForModel(vehicle, model), model))
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise(resolve => window.setTimeout(resolve, Math.max(0, 450 - (performance.now() - started))))
      }
      if (runToken.current !== token) return
      setResult({ assumptions: model, vehicles: results, count: SIMULATIONS })
      setRuns(value => value + 1)
    } catch {
      if (runToken.current === token) setError('The model could not run. Check the assumptions and try again.')
    } finally {
      if (runToken.current === token) setRunning(false)
    }
  }

  return <div className="futures" data-running={running} data-stale={stale}>
    <form className="futures-controls" onSubmit={run}>
      <fieldset disabled={running}><legend className="sr-only">Model assumptions</legend>{fields.map(field => <div className="futures-field" key={field.key}>
        <label className="mono" htmlFor={`${id}-${field.key}`}>{field.label}</label>
        <div><input id={`${id}-${field.key}`} aria-describedby={`${id}-${field.key}-unit`} type="number" inputMode={field.key === 'years' || field.key === 'mileage' ? 'numeric' : 'decimal'} required min={field.min} max={field.max} step={field.step} value={inputs[field.key]} onChange={event => setInputs(previous => ({ ...previous, [field.key]: event.target.value }))} /><span id={`${id}-${field.key}-unit`} className="mono">{field.unit}</span></div>
      </div>)}</fieldset>
      <button className="button button-dark" type="submit" disabled={running}>{running ? 'Generating futures…' : stale ? 'Update model' : runs ? 'Run again' : 'Run 10,000 futures'}<Arrow /></button>
    </form>
    <div className="futures-topline mono"><span>STOCHASTIC DECISION MODEL</span><span role="status" aria-live="polite">{running ? 'SAMPLING 3 VEHICLES…' : stale ? 'ASSUMPTIONS CHANGED — UPDATE MODEL' : result ? `10,000 FUTURES / VEHICLE · RUN ${String(runs).padStart(3, '0')}` : '3 VEHICLES / 10,000 POSSIBLE FUTURES EACH'}</span></div>
    {error && <p role="alert" className="futures-error">{error}</p>}
    <div className="futures-plot-heading"><span className="mono">{result?.assumptions.years ?? defaultAssumptions.years}-YEAR OWNERSHIP / {sensitivity ? 'SENSITIVITY' : 'NPV DISTRIBUTION'}</span>{!sensitivity && <div className="futures-legend">{vehicles.map(vehicle => <span key={vehicle.id} className={`vehicle-${vehicle.id}`}><i />{vehicle.name}</span>)}</div>}</div>
    <div id={`${id}-visualization`} className="futures-visualization" aria-busy={running}>
      {sensitivity && result ? <SensitivityChart result={result} /> : <DistributionChart result={result} run={runs} />}
    </div>
    <div className="futures-axis-note mono"><span>{sensitivity ? 'ONE INPUT AT A TIME / OTHERS FIXED' : 'NEGATIVE NPV = PRESENT OWNERSHIP COST'}</span><span>HIGHER NPV = LOWER COST →</span></div>
    <div className="futures-summaries" aria-busy={running}>
      {vehicles.map(vehicle => {
        const stats = result?.vehicles.find(item => item.vehicle.id === vehicle.id)?.statistics
        return <section className={`futures-summary vehicle-${vehicle.id}`} key={vehicle.id} aria-label={`${vehicle.fullName} results`}>
          <h3><i />{vehicle.name}<span className="mono">{vehicle.id === 'bolt' ? 'ELECTRIC' : vehicle.id === 'prius' ? 'HYBRID' : 'GASOLINE'}</span></h3>
          <dl><div className="futures-expected"><dt className="mono">EXPECTED NPV</dt><dd>{stats ? currency(stats.mean) : '—'}</dd></div><div><dt className="mono">WORST 5% <span>/ CVaR</span></dt><dd>{stats ? currency(stats.cvar5) : '—'}</dd></div><div><dt className="mono">SPREAD <span>/ SD</span></dt><dd>{stats ? currency(stats.standardDeviation) : '—'}</dd></div></dl>
          <span className="futures-var mono">5TH PERCENTILE / VaR {stats ? currency(stats.var5) : '—'}</span>
        </section>
      })}
    </div>
    <div className="futures-bottomline"><span className="mono">2% INFLATION / 6% DISCOUNT RATE</span><button type="button" className="futures-risk-button" aria-expanded={sensitivity} aria-controls={`${id}-visualization`} disabled={!result || running} onClick={() => setSensitivity(value => !value)}>{sensitivity ? 'Back to distributions' : 'What drives the risk?'}<Arrow /></button></div>
    <p className="futures-method-note">Worst 5% is the average NPV in the lowest 5% of outcomes. Spread is standard deviation. Model assumptions, not observed market outcomes.</p>
  </div>
}
