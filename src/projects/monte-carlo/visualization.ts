import type { VehicleResult } from './simulation'

export const currency = (value: number) => `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
export const compactCurrency = (value: number) => `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value) / 1000)}k`

export function histogramData(results: VehicleResult[], binCount = 90) {
  const min = Math.floor(Math.min(...results.map(result => result.statistics.min)) / 1000) * 1000
  const max = Math.ceil(Math.max(...results.map(result => result.statistics.max)) / 1000) * 1000
  const upper = max === min ? min + 1000 : max
  const binWidth = (upper - min) / binCount
  const series = results.map(result => {
    const bins = new Array<number>(binCount).fill(0)
    for (const value of result.outcomes) bins[Math.max(0, Math.min(binCount - 1, Math.floor((value - min) / binWidth)))]++
    return { id: result.vehicle.id, bins, count: result.outcomes.length }
  })
  const maxFraction = Math.max(...series.flatMap(series => series.bins.map(count => count / series.count)))
  return { min, max: upper, binWidth, series, maxFraction }
}

export function histogramPath(bins: number[], left: number, top: number, width: number, height: number, maxCount: number): string {
  const step = width / bins.length
  let path = `M ${left} ${top + height}`
  bins.forEach((count, index) => {
    const y = top + height - count / maxCount * height
    path += ` L ${left + index * step} ${y} L ${left + (index + 1) * step} ${y}`
  })
  return `${path} L ${left + width} ${top + height} Z`
}
