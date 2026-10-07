import { WorkingProduct } from './WorkingProduct'
import './styles.css'

const implementation = [
  { label: 'Agent coordination', value: 'A2A / ADK' },
  { label: 'Policy & orchestration', value: 'FastAPI / WebSockets' },
  { label: 'Intent verification', value: 'Gemini / isolated context' },
  { label: 'Payment control', value: 'Transaction-scoped virtual card' },
  { label: 'Decision audit', value: 'SHA-256 / Hedera HCS' },
]

export default function ArgusProjectContent() {
  return <div className="argus-project-content">
    <section className="argus-system" aria-labelledby="argus-system-title">
      <div className="argus-proof-heading"><span className="mono">01 / THE SYSTEM</span><h2 id="argus-system-title">The agent can shop.<br />Argus decides if it can pay.</h2></div>
      <div className="argus-system-principles">
        <div><span className="mono">ISOLATED INTENT</span><p>The evaluator receives the original conversation. Browsing instructions stay outside that trust boundary, so a product page cannot rewrite what the user asked for.</p></div>
        <div><span className="mono">INDEPENDENT AUTHORIZATION</span><p>A purchase attempt passes policy and intent checks before payment access is issued. A permitted transaction receives a single-use card scoped to its merchant and amount.</p></div>
        <div><span className="mono">AN AUDITABLE DECISION</span><p>The decision record is hashed with SHA-256 and submitted through Hedera HCS. The animation above follows one authored transaction through interpretation, deterministic routing, and enforcement; it makes no model calls, payments, or network submissions.</p></div>
      </div>
    </section>
    <section className="argus-working-product" aria-labelledby="argus-product-title">
      <div className="argus-proof-heading"><span className="mono">02 / WORKING PRODUCT</span><h2 id="argus-product-title">Watch the system work.</h2></div>
      <WorkingProduct />
    </section>
    <section className="argus-implementation" aria-labelledby="argus-implementation-title">
      <div className="argus-proof-heading"><span className="mono">03 / IMPLEMENTATION</span><h2 id="argus-implementation-title">Behind the boundary.</h2></div>
      <dl>{implementation.map(item => <div key={item.label}><dt className="mono">{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    </section>
  </div>
}
