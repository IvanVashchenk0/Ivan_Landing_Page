// Controlled architecture example, never a model response or payment request.
export const scenario = {
  request: 'Buy noise-canceling headphones under $300.',
  policy: { category: 'Electronics', budget: 300, merchantPolicy: 'Approved retailers', approvalThreshold: 350 },
  purchase: { product: 'Sony WH-1000XM6', productType: 'Headphones', feature: 'Noise-canceling', category: 'Electronics', merchant: 'Best Buy', amount: 278.49, merchantApproved: true },
  // No numerical hard limit is supplied. This fixture is an explicit policy result.
  withinHardLimit: true,
  interpretation: { productType: 'Headphones', requiredFeature: 'Noise-canceling', maximumAmount: 300, category: 'Electronics' },
} as const

export interface AuthorizationInput {
  intent_match: boolean
  verification_passed: boolean
  merchant_allowed: boolean
  category_allowed: boolean
  within_hard_limit: boolean
  requires_approval: boolean
}
export type AuthorizationRoute = 'DENY' | 'REVIEW' | 'AUTHORIZE'

export function evaluatePolicy(input: { amount: number; budget: number; approvalThreshold: number; merchantApproved: boolean; category: string; allowedCategory: string; withinHardLimit: boolean }) {
  return {
    merchant_allowed: input.merchantApproved,
    category_allowed: input.category === input.allowedCategory,
    within_hard_limit: input.withinHardLimit,
    within_user_budget: input.amount <= input.budget,
    // This is application policy, not model-assisted interpretation.
    requires_approval: input.amount > input.approvalThreshold,
  }
}

export function routeAuthorization(input: AuthorizationInput): AuthorizationRoute {
  if (!input.intent_match || !input.verification_passed || !input.merchant_allowed || !input.category_allowed || !input.within_hard_limit) return 'DENY'
  return input.requires_approval ? 'REVIEW' : 'AUTHORIZE'
}

export const policyResult = evaluatePolicy({
  amount: scenario.purchase.amount, budget: scenario.policy.budget,
  approvalThreshold: scenario.policy.approvalThreshold,
  merchantApproved: scenario.purchase.merchantApproved,
  category: scenario.purchase.category, allowedCategory: scenario.policy.category,
  withinHardLimit: scenario.withinHardLimit,
})
const intentMatch = scenario.purchase.productType === scenario.interpretation.productType && scenario.purchase.feature === scenario.interpretation.requiredFeature
export const verificationResult = {
  intent_match: intentMatch,
  merchant_valid: policyResult.merchant_allowed,
  amount_valid: policyResult.within_user_budget,
  material_intent_drift: !intentMatch,
  verification_passed: intentMatch && policyResult.merchant_allowed && policyResult.within_user_budget,
}
export const authorizationInput: AuthorizationInput = {
  intent_match: verificationResult.intent_match,
  verification_passed: verificationResult.verification_passed,
  merchant_allowed: policyResult.merchant_allowed,
  category_allowed: policyResult.category_allowed,
  within_hard_limit: policyResult.within_hard_limit,
  requires_approval: policyResult.requires_approval,
}
export const money = (amount: number) => `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
