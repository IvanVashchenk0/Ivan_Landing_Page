export type SceneId = 'SETUP' | 'INPUTS' | 'ONE_FUTURE' | 'FULL_PATH' | 'DISCOUNT' | 'REPEAT' | 'HISTOGRAM' | 'ANATOMY' | 'VAR' | 'CVAR' | 'VEHICLES' | 'COMPARISON' | 'SENSITIVITY' | 'FRAMEWORK'
const definitions: { id: SceneId; duration: number; title: string; announcement: string }[] = [
  { id: 'SETUP', duration: 3000, title: 'A decision under uncertainty.', announcement: 'Compare eight-year ownership risk for the Bolt, Prius, and Civic.' },
  { id: 'INPUTS', duration: 4000, title: 'Some inputs vary.', announcement: 'Fixed assumptions define ownership. Electricity, maintenance, and insurance use independent normal draws.' },
  { id: 'ONE_FUTURE', duration: 5000, title: 'Build one possible year.', announcement: 'Sample three costs, calculate electricity expense, and combine them with the loan payment.' },
  { id: 'FULL_PATH', duration: 4000, title: 'One complete financial history.', announcement: 'Sample eight years, apply inflation, finish the loan after year five, and add resale in year eight.' },
  { id: 'DISCOUNT', duration: 3000, title: 'Eight years. One present value.', announcement: 'Discount annual cash flows at six percent. Include the initial down payment to obtain one NPV.' },
  { id: 'REPEAT', duration: 4000, title: 'Repeat the same calculation.', announcement: 'Generate ten thousand futures. The gold path is one example, not a prediction.' },
  { id: 'HISTOGRAM', duration: 4000, title: 'Every future becomes one NPV.', announcement: 'Group all ten thousand resulting NPVs into histogram bins.' },
  { id: 'ANATOMY', duration: 3000, title: 'Read the range of outcomes.', announcement: 'Locate the fifth percentile, median, ninety-fifth percentile, and mean.' },
  { id: 'VAR', duration: 2000, title: 'Where does the worst 5% begin?', announcement: 'VaR is the fifth-percentile NPV cutoff. Worse outcomes are to the left.' },
  { id: 'CVAR', duration: 3000, title: 'How bad is that lower tail?', announcement: 'CVaR averages all outcomes at or below VaR.' },
  { id: 'VEHICLES', duration: 4000, title: 'Compare distributions, not stickers.', announcement: 'Compare mean, VaR, and CVaR for all three vehicles using shared chart scales.' },
  { id: 'COMPARISON', duration: 4000, title: 'Compare the entire distribution.', announcement: 'Empirical cumulative distributions support sample-specific first- and second-order dominance comparisons.' },
  { id: 'SENSITIVITY', duration: 4000, title: 'What actually drives the result?', announcement: 'Change one input by ten percent each way. Insurance has the largest effect for the Bolt baseline.' },
  { id: 'FRAMEWORK', duration: 2000, title: '10,000 FUTURES', announcement: 'Uncertainty, simulation, NPV distribution, tail risk, stochastic comparison, sensitivity, decision. Explore the interactive model below.' },
]
let start = 0
export const timeline = definitions.map(scene => { const entry = { ...scene, start }; start += scene.duration; return entry })
export const TOTAL_DURATION = start
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
export function frameAt(elapsed: number) {
  const time = Math.max(0, Math.min(TOTAL_DURATION, elapsed))
  const index = Math.max(0, timeline.findLastIndex(scene => time >= scene.start))
  const scene = timeline[index]
  return { scene, index, localTime: time - scene.start, progress: clamp01((time - scene.start) / scene.duration) }
}
