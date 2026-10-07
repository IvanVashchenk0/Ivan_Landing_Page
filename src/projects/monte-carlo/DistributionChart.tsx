import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MonteCarloResult } from './simulation'
import { compactCurrency, currency, histogramData, histogramPath } from './visualization'

export function DistributionChart({ result, run }: { result: MonteCarloResult | null; run: number }) {
  const id = useId()
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const data = useMemo(() => result ? histogramData(result.vehicles) : null, [result])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    if (frame.current) observer.observe(frame.current)
    return () => observer.disconnect()
  }, [])
  const left = 36
  const right = 18
  const top = 25
  const height = 170
  const plotWidth = width - left - right
  const yMax = data ? Math.ceil(data.maxFraction * 100 / 3) * 3 : 9
  const ticks = width < 500 ? 3 : 5
  return <div ref={frame} className="futures-chart">
    <svg viewBox={`0 0 ${width} 237`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{result ? `${result.assumptions.years}-year vehicle NPV distributions from 10,000 futures each` : 'Vehicle distributions — run the model to generate outcomes'}</title>
      <desc id={`${id}-description`}>{result ? result.vehicles.map(({ vehicle, statistics }) => `${vehicle.fullName}: expected NPV ${currency(statistics.mean)}, worst 5% average ${currency(statistics.cvar5)}.`).join(' ') + ' All distributions share the same dollar and frequency scales. Higher NPV means lower present cost.' : 'No sampled outcomes yet.'}</desc>
      {[0, 1, 2, 3].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={top + height - tick * height / 3} y2={top + height - tick * height / 3} className="futures-grid" />{data && <text x={left - 9} y={top + height - tick * height / 3 + 4} textAnchor="end">{(yMax * tick / 3).toFixed(0)}%</text>}</g>)}
      {data && <g key={run} className="futures-distributions">{data.series.map(series => <path key={series.id} className={`futures-density vehicle-${series.id}`} d={histogramPath(series.bins, left, top, plotWidth, height, yMax / 100 * series.count)} />)}</g>}
      {data && Array.from({ length: ticks }, (_, index) => <text key={index} x={left + index / (ticks - 1) * plotWidth} y="219" textAnchor={index === 0 ? 'start' : index === ticks - 1 ? 'end' : 'middle'}>{compactCurrency(data.min + index / (ticks - 1) * (data.max - data.min))}</text>)}
      {!data && <g className="futures-chart-empty"><text x={width / 2} y="100" textAnchor="middle">One forecast hides uncertainty.</text><text x={width / 2} y="126" textAnchor="middle">Run the model. See the range.</text></g>}
    </svg>
  </div>
}
