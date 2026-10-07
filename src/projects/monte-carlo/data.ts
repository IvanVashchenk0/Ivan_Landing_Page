import type { ProjectDefinition } from '../../types/project'

export default {
    id: 'monte-carlo', title: '10,000 FUTURES', category: 'ai', featured: true, order: 6,
    previewType: 'component', preview: { load: () => import('./index') }, projectPage: { loadContent: () => import('./ProjectContent') }, featuredOrder: 3,
    experience: 'monte-carlo', eyebrow: 'Mechanical engineering / Computational methods',
    description: 'Three vehicles. Thousands of possible futures. A clearer view of risk.',
    interaction: 'From uncertainty to a decision', status: 'Animation + live model', theme: 'light',
    details: [
      { label: 'The model', text: 'An Engineering Economy decision model for the Chevrolet Bolt EV, Toyota Prius HEV, and Honda Civic LX. Each future includes a 10% down payment, five annual loan payments, energy, maintenance, insurance, and terminal resale. Recurring costs rise 2% from year two; all annual cash flows are discounted at 6%.' },
      { label: 'Reading the risk', text: 'Negative NPV represents present ownership cost, so higher is better. Expected NPV is the sample mean; spread is sample standard deviation. VaR is the fifth percentile. CVaR averages all outcomes at or below that threshold. The animation follows a reproducible 10,000-sample run per vehicle; the interactive simulator generates fresh samples each run. Empirical CDF comparisons describe the demonstration sample, not guaranteed population dominance.' },
      { label: 'Assumptions & sensitivity', text: 'Annual costs use independent, untruncated normal draws. Price controls change the means while the original standard deviations stay fixed. Terminal resale stays at 30%, 35%, and 40% of purchase price, respectively, even when ownership years change. Sensitivity evaluates exact expected NPV at ±10% of each input, including relative changes to resale percentage. These are project assumptions, not observed market data.' },
    ],
  } satisfies ProjectDefinition
