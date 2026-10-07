import { useId } from 'react'
import type { Demonstration } from './scenario'
import { compactCurrency } from './visualization'
import { clamp01 } from './timeline'

const colors = ['#74775d', '#a78c66', '#525b64']
export function Distribution({ data, index = 0, shared = false, progress = 1, markers = [], tail = false, particles = false, tailProgress }: {
  data: Demonstration; index?: number; shared?: boolean; progress?: number; markers?: { value: number; label: string; gold?: boolean }[]; tail?: boolean; particles?: boolean; tailProgress?: number
}) {
  const id = useId()
  const h = shared ? data.histogram : data.boltHistogram
  const series = h.series[shared ? index : 0]
  const x = (value: number) => 12 + (value - h.min) / (h.max - h.min) * 576
  const max = h.maxFraction * series.count
  const result = data.results[index]
  return <div className="future-film-chart" role="img" aria-label={`${result.vehicle.fullName}: ${series.count.toLocaleString('en-US')} NPVs${tail ? '; burgundy marks outcomes at or below the fifth-percentile cutoff' : ''}`}>
    <svg viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={id}><rect x="0" y="0" width={x(result.statistics.var5)} height="210" /></clipPath></defs>
      {[50, 100, 150, 190].map(y => <line className="ff-gridline" key={y} x1="12" x2="588" y1={y} y2={y} />)}
      {series.bins.map((count, i) => {
        const height = count / max * 157 * clamp01(progress * 1.7 - i / series.bins.length * .7)
        return <rect key={i} x={12 + i / series.bins.length * 576} y={190 - height} width={576 / series.bins.length - 1.5} height={height} fill={colors[index]} opacity=".65" />
      })}
      {tail && <g clipPath={`url(#${id})`}>{series.bins.map((count, i) => <rect key={i} x={12 + i / series.bins.length * 576} y={190 - count / max * 157} width={576 / series.bins.length - 1.5} height={count / max * 157} fill="#713e47" />)}</g>}
      {tailProgress !== undefined && Array.from(data.tail).filter((_, i) => i % Math.max(1, Math.floor(data.tail.length / 24)) === 0).slice(0, 24).map((value, i) => {
        const p = clamp01(tailProgress * 1.7 - .15)
        return <circle key={i} cx={x(value) + (x(result.statistics.cvar5) - x(value)) * p} cy={170 - p * 140} r="2.5" fill="#713e47" opacity={tailProgress > .85 ? .15 : .7} />
      })}
      {markers.map(marker => <line key={marker.label} x1={x(marker.value)} x2={x(marker.value)} y1="18" y2="195" stroke={marker.gold ? '#b38a37' : '#713e47'} strokeWidth="2" strokeDasharray={marker.gold ? undefined : '4 4'} />)}
      {particles && progress < 1 && data.bolt.traces!.slice(0, 32).map((trace, i) => {
        const p = clamp01(progress * 2 - i / 48)
        return <circle key={i} cx={12 + i / 31 * 576 + (x(trace.npv) - (12 + i / 31 * 576)) * p} cy={12 + 150 * p} r="3" fill={i === 0 ? '#b38a37' : '#74775d'} opacity={1 - p} />
      })}
    </svg>
    <div className="ff-chart-axis"><span>{compactCurrency(h.min)}</span><span>NPV →</span><span>{compactCurrency(h.max)}</span></div>
  </div>
}

export function Paths({ data, progress, reduced, discount = false }: { data: Demonstration; progress: number; reduced: boolean; discount?: boolean }) {
  const paths = discount ? [data.trace] : data.bolt.traces!
  const min = Math.min(...data.bolt.traces!.map(trace => trace.npv)) * 1.06
  const count = discount ? 1 : Math.max(1, Math.round(128 * progress))
  const points = (values: number[]) => values.map((value, i) => `${i ? 'L' : 'M'} ${15 + i / 8 * 570} ${15 + value / min * 165}`).join(' ')
  return <div className="future-film-chart ff-path-chart" role="img" aria-label={discount ? 'Discounted annual costs accumulate into one NPV' : '128 example cumulative discounted cash-flow trajectories from 10,000 simulated futures'}>
    <svg viewBox="0 0 600 200" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(year => <line key={year} x1={15 + year / 8 * 570} x2={15 + year / 8 * 570} y1="10" y2="188" className="ff-gridline" />)}
      {paths.slice(1, count).map(trace => <path key={trace.sample} d={points([trace.initialCashFlow, ...trace.years.map(year => year.cumulativeNPV)])} fill="none" stroke="#74775d" strokeWidth="1" opacity=".17" />)}
      <path d={points([data.trace.initialCashFlow, ...data.trace.years.map(year => year.cumulativeNPV)])} fill="none" stroke="#b38a37" strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={discount && !reduced ? 1 - progress : 0} />
    </svg>
    <div className="ff-chart-axis"><span>Y0</span><span>CUMULATIVE DISCOUNTED CASH FLOW</span><span>Y8</span></div>
  </div>
}

export function CDFChart({ data, progress }: { data: Demonstration; progress: number }) {
  const id = useId()
  const h = data.histogram
  const x = (value: number) => 12 + (value - h.min) / (h.max - h.min) * 576
  return <div className="future-film-chart" role="img" aria-label="Empirical cumulative probabilities for Bolt, Prius, and Civic; higher NPV is better">
    <div className="ff-chart-axis"><span>CUMULATIVE PROBABILITY</span><span>100%</span></div>
    <svg viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id={id}><rect x="0" y="0" width={12 + 576 * progress} height="210" /></clipPath></defs>
      {progress < 1 && h.series.map((series, index) => <g key={series.id} opacity={(1 - progress) * .45}>{series.bins.map((count, i) => <rect key={i} x={12 + i / series.bins.length * 576} y={200 - count / (h.maxFraction * series.count) * 150} width={576 / series.bins.length - 1} height={count / (h.maxFraction * series.count) * 150} fill={colors[index]}/>)}</g>)}
      {[20, 65, 110, 155, 200].map(y => <line key={y} className="ff-gridline" x1="12" x2="588" y1={y} y2={y} />)}
      {data.results.map((result, index) => {
        // All observations determine the ECDF; path vertices are thinned for display only.
        const points = result.cdf.filter((_, i) => i % 20 === 0 || i === result.cdf.length - 1)
        let d = 'M 12 200'
        for (const point of points) d += ` H ${x(point.x)} V ${200 - point.probability * 180}`
        d += ` H 588`
        return <path key={result.vehicle.id} d={d} clipPath={`url(#${id})`} fill="none" stroke={colors[index]} strokeWidth="3" strokeDasharray={index === 1 ? '7 3' : index === 2 ? '2 3' : undefined} />
      })}
    </svg>
    <div className="ff-chart-axis"><span>0% / {compactCurrency(h.min)}</span><span>NPV →</span><span>{compactCurrency(h.max)}</span></div>
  </div>
}

