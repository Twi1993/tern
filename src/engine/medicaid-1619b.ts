/**
 * 1619(b) Medicaid While Working — threshold lookup and eligibility determination
 * Source: WIPA National Training Curriculum 2026 Edition, Chapter 5
 * Authority: SSA POMS SI 02302.200
 *
 * When SSI cash payment reaches $0 due to earnings, beneficiaries may retain
 * Medicaid under Section 1619(b) if their countable annual earnings stay below
 * their state's threshold. This is the most important safety net for working
 * SSI recipients.
 *
 * CRITICAL: Warn specialists BEFORE a job recommendation pushes countable annual
 * earnings over the threshold — this is the most common high-stakes field error.
 */

/**
 * 2026 state 1619(b) annual thresholds (countable earned income).
 * Source: SSA POMS SI 02302.200 — updated annually each January.
 * IRWEs, BWEs, and approved PASS deductions are subtracted from gross earnings
 * to determine countable annual earnings for this comparison.
 */
export const STATE_1619B_THRESHOLDS_2026: Record<string, number> = {
  AL: 30996,
  AK: 52908,
  AZ: 29316,
  AR: 26568,
  CA: 38448,
  CO: 37044,
  CT: 51324,
  DE: 36576,
  DC: 46128,
  FL: 28980,
  GA: 28344,
  HI: 40344,
  ID: 30000,
  IL: 34572,
  IN: 31188,
  IA: 33576,
  KS: 30648,
  KY: 29424,
  LA: 27588,
  ME: 37200,
  MD: 42300,
  MA: 47988,
  MI: 35064,
  MN: 48492,
  MS: 25668,
  MO: 30468,
  MT: 31308,
  NE: 32628,
  NV: 32988,
  NH: 44424,
  NJ: 46788,
  NM: 29268,
  NY: 50628,
  NC: 30300,
  ND: 35424,
  OH: 31536,
  OK: 27804,
  OR: 38400,
  PA: 37716,
  RI: 43428,
  SC: 27852,
  SD: 31560,
  TN: 27396,
  TX: 28188,
  UT: 31044,
  VT: 43524,
  VA: 36552,
  WA: 44052,
  WV: 27564,
  WI: 38700,
  WY: 34908,
}

export type Medicaid1619bStatus = 'SAFE' | 'AT_RISK' | 'OVER_THRESHOLD' | 'NOT_APPLICABLE'

export interface Medicaid1619bResult {
  status: Medicaid1619bStatus
  stateThreshold: number | null
  estimatedAnnualCountableEarnings: number
  /** How much headroom remains before threshold is breached (negative = over) */
  headroom: number | null
  warning: string | null
}

/**
 * Determine 1619(b) Medicaid status for a client.
 *
 * @param state           Two-letter state code
 * @param grossMonthlyWages
 * @param monthlyIRWE     Impairment Related Work Expenses (reduce countable income)
 * @param monthlyBWE      Blind Work Expenses (reduce countable income)
 * @param monthlyPASS     PASS deduction (reduces countable income)
 * @param adjustedSSIPayment  Step 22 result — 1619(b) only activates when this is $0
 */
export function evaluate1619b(
  state: string,
  grossMonthlyWages: number,
  monthlyIRWE: number,
  monthlyBWE: number,
  monthlyPASS: number,
  adjustedSSIPayment: number,
): Medicaid1619bResult {
  // 1619(b) only relevant when SSI cash payment is $0
  if (adjustedSSIPayment > 0) {
    return {
      status: 'NOT_APPLICABLE',
      stateThreshold: null,
      estimatedAnnualCountableEarnings: 0,
      headroom: null,
      warning: null,
    }
  }

  const threshold = STATE_1619B_THRESHOLDS_2026[state.toUpperCase()] ?? null
  if (threshold === null) {
    return {
      status: 'NOT_APPLICABLE',
      stateThreshold: null,
      estimatedAnnualCountableEarnings: 0,
      headroom: null,
      warning: `Unknown state code "${state}". Cannot determine 1619(b) threshold.`,
    }
  }

  // Countable annual earnings = (gross wages - IRWE - BWE - PASS) * 12
  const monthlyDeductions = monthlyIRWE + monthlyBWE + monthlyPASS
  const monthlyCountable = Math.max(0, grossMonthlyWages - monthlyDeductions)
  const annualCountable = monthlyCountable * 12

  const headroom = threshold - annualCountable

  let status: Medicaid1619bStatus
  let warning: string | null = null

  if (annualCountable > threshold) {
    status = 'OVER_THRESHOLD'
    warning =
      `Estimated annual countable earnings ($${annualCountable.toLocaleString()}) exceed ` +
      `the ${state} 1619(b) threshold ($${threshold.toLocaleString()}). ` +
      `Medicaid coverage is at risk. Consult a CWIC before client accepts this position.`
  } else if (headroom < threshold * 0.1) {
    // Within 10% of threshold
    status = 'AT_RISK'
    warning =
      `Within $${headroom.toLocaleString()} of the ${state} 1619(b) threshold ` +
      `($${threshold.toLocaleString()}). Any wage increase or additional hours could trigger Medicaid loss.`
  } else {
    status = 'SAFE'
  }

  return {
    status,
    stateThreshold: threshold,
    estimatedAnnualCountableEarnings: annualCountable,
    headroom,
    warning,
  }
}
