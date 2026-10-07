### 10,000 Futures animation

`src/projects/monte-carlo/scenario.ts` computes and caches a reproducible run (LCG seed 460, paired Box–Muller normal draws) with the default eight-year model and 10,000 outcomes per vehicle. Optional `SimulationTrace` capture retains sampled inputs, annual cash flows, discounted contributions, and cumulative NPV for 128 Bolt paths. Traced and untraced simulation share `annualCashFlow` and produce identical results for identical draws. The first sample supplies all example values; rounding is for display only.

`timeline.ts` defines 14 editable timing targets totaling 49,000 ms. A single elapsed-time clock controls scenes and transitions, with autoplay at 35% visibility, offscreen/hidden-tab suspension, persistent manual pause, skip, replay, and a held final framework. Reduced motion retains every scene without traveling signals, scaling, or fades. Portrait scenes share a reserved content-driven height; charts and comparisons reflow rather than shrinking a desktop canvas.

The fan renders a labeled subset of at most 128 paths; histogram/statistical calculations use every outcome. Animation histograms use 48 bins, sharing both axes for vehicle comparison. Median and 95th percentile use the existing interpolation rule. The gold path is an example, not a prediction. Sensitivity preserves relative ±10% changes and correctly ranks insurance first for the default Bolt assumptions.

`comparison.ts` checks empirical CDFs at every pooled sample breakpoint. First-order dominance requires one CDF to be no greater everywhere and strictly lower somewhere. Second-order dominance requires every cumulative CDF-difference integral to be nonpositive and at least one strictly negative; a single whole-range integral is insufficient. Tolerances are 1e-12 in probability and 1e-8 in integrated NPV units. Results describe only the demonstration sample. The display thins CDF vertices, but all observations contribute to probabilities and comparisons. The animation is explanatory, not a population-dominance or vehicle-recommendation claim. No Bayesian update is included.

### Vehicle model methodology

The Python scripts are reference material only: they are not copied into, loaded by, or required by the website. `vehicleData.ts` contains the supplied constants; `simulation.ts`, `statistics.ts`, and `sensitivity.ts` keep all calculations outside React. The corrected energy formulas from `ENGR460_MCT.py` take priority over older scripts:

- EV: miles ÷ 100 × kWh per 100 miles × electricity price.
- Gas/hybrid: miles ÷ mpg × gasoline price.
- Year 0: negative 10% down payment. Years 1–5: fixed annual loan payment. Recurring energy, maintenance, and insurance use inflation factor `(1.02)^(year − 1)`; terminal resale is purchase price × resale percentage. Discount every annual flow by `(1.06)^year`.
- Defaults: 12,000 miles/year, 8 years, $3.40/gallon, $0.25/kWh, 2% inflation, 6% discount rate. NPV is negative for net ownership costs; **higher NPV means lower cost**.
- Annual prices, maintenance, and insurance are independent, untruncated normal draws using paired Box–Muller sampling. No new correlations or clipping are introduced. Changing price means retains the original absolute standard deviations. The model's normal assumptions permit negative draws; the distributions are not fitted to live market data.
- VaR uses linear interpolation at `(n − 1) × 0.05`. CVaR is the mean of **all** outcomes at or below that threshold, including ties. Spread uses sample standard deviation (`n − 1`). Interactive histograms retain every sample using 90 shared bins, with no tail cropping.
- Sensitivity changes each of four inputs by ±10% **relative** to its current baseline. Unlike the old script's ±10 percentage-point resale change, a 30% resale assumption becomes 27% / 33%. As NPV is linear in the uncertain inputs, evaluating their means gives the exact expected NPV and avoids noisy sensitivity rankings.
- Ownership controls span 5–15 years, at or beyond the supplied loan term. Terminal resale percentages remain fixed across durations; no depreciation curve or additional financing assumption is invented.
- UI calculations yield between vehicles, aggregate the outcomes, and render three SVG paths. A brief reveal respects reduced motion. No worker, Python runtime, backend, chart library, or Bayesian updating is added. Empirical dominance is confined to the reproducible animation sample.

| Supplied assumption | Bolt EV | Prius HEV | Civic LX |
| --- | ---: | ---: | ---: |
| Purchase price | $20,084.43 | $30,692.75 | $26,326.25 |
| Annual loan payment, 5 years | $4,974.37 | $6,368.18 | $5,447.21 |
| Consumption | 28 kWh/100 mi | 57 mpg | 36 mpg |
| Energy price mean / SD | $0.25 / $0.05 | $3.40 / $0.68 | $3.40 / $0.68 |
| Annual maintenance mean / SD | $400 / $80 | $550 / $110 | $600 / $120 |
| Annual insurance mean / SD | $1,400 / $280 | $1,200 / $240 | $1,100 / $220 |
| Terminal resale | 30% | 35% | 40% |

