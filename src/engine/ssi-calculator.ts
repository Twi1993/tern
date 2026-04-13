/**
 * SSI 27-Step Calculation Sheet
 * Source: WIPA National Training Curriculum 2026 Edition, Chapter 3, pp. 18-21
 *
 * CRITICAL: Steps must execute in the exact order shown — federal regulation
 * determines this sequence. Reordering produces incorrect results.
 *
 * Key result rows: Steps 3, 15, 19, 22, 27
 */

import { CURRENT_CONSTANTS } from './benefit-constants.ts'
import type { ClientProfile, SSICalculationResult, SSISteps } from '../types/index.ts'

/**
 * Clamp a value to a minimum of 0. SSI payments and intermediate remainders
 * cannot be negative — any negative result means the deduction was exhausted.
 */
function floor0(value: number): number {
  return Math.max(0, value)
}

export function calculateSSI(
  profile: ClientProfile,
  grossMonthlyWages: number,
): SSICalculationResult {
  const C = CURRENT_CONSTANTS

  const fbr = profile.householdType === 'ELIGIBLE_COUPLE' ? C.FBR_COUPLE : C.FBR_INDIVIDUAL

  // ── UNEARNED INCOME SIDE ──────────────────────────────────────────────────

  // Step 1: Unearned income (non-SSI/SSDI — e.g. pensions, interest, gifts)
  const step1 = profile.monthlyUnearnedIncome

  // Step 2: Apply GIE ($20) to unearned income first
  const gieAppliedToUnearned = Math.min(C.GIE, step1)
  const step2 = gieAppliedToUnearned

  // Step 3: Countable Unearned Income (CUI) — KEY RESULT ROW
  const step3 = floor0(step1 - step2)

  // ── EARNED INCOME SIDE ───────────────────────────────────────────────────

  // Step 4: Gross earned income
  const step4 = grossMonthlyWages

  // Step 5: Student Earned Income Exclusion (SEIE)
  // Eligibility: under 22 AND regularly attending school
  // Cannot exceed monthly cap or push annual total over annual cap
  let seieApplied = 0
  if (profile.isStudent && step4 > 0) {
    const remainingAnnual = floor0(C.SEIE_ANNUAL_MAX - profile.seieAnnualUsed)
    seieApplied = Math.min(step4, C.SEIE_MONTHLY_MAX, remainingAnnual)
  }
  const step5 = seieApplied

  // Step 6: Remainder after SEIE
  const step6 = floor0(step4 - step5)

  // Step 7: Apply remaining GIE to earned income (if any GIE unused from Step 2)
  const gieRemaining = floor0(C.GIE - gieAppliedToUnearned)
  const gieAppliedToEarned = Math.min(gieRemaining, step6)
  const step7 = gieAppliedToEarned

  // Step 8: Remainder
  const step8 = floor0(step6 - step7)

  // Step 9: Earned Income Exclusion ($65)
  const step9 = Math.min(C.EIE, step8)

  // Step 10: Remainder
  const step10 = floor0(step8 - step9)

  // Step 11: Subtract IRWE (Impairment Related Work Expenses)
  // IRWE reduces countable income BEFORE the one-for-two offset
  const irweApplied = Math.min(profile.monthlyIRWE, step10)
  const step11 = irweApplied

  // Step 12: Remainder
  const step12 = floor0(step10 - step11)

  // Step 13: Divide by 2 — the "one-for-two" offset (core work incentive)
  const step13 = step12 / 2

  // Step 14: Blind Work Expenses (BWE) — blindness only, applied AFTER the ÷2
  // BWE is broader than IRWE: any work-related expense regardless of disability connection
  const bweApplied = profile.isBlind ? Math.min(profile.monthlyBWE, step13) : 0
  const step14 = bweApplied

  // Step 15: Total Countable Earned Income (CEI) — KEY RESULT ROW
  const step15 = floor0(step13 - step14)

  // ── COMBINING EARNED AND UNEARNED ────────────────────────────────────────

  // Step 16: Add Countable Unearned Income (from Step 3)
  const step16 = step3

  // Step 17: Add Countable Earned Income (from Step 15)
  const step17 = step15

  // Step 18: Subtract PASS deduction
  // PASS allows setting aside income/resources toward an approved vocational goal
  const passApplied = profile.monthlyPASS
  const step18 = passApplied

  // Step 19: Total Countable Income — KEY RESULT ROW
  const step19 = floor0(step16 + step17 - step18)

  // ── SSI PAYMENT ──────────────────────────────────────────────────────────

  // Step 20: SSI Federal Benefit Rate (VTR — Value of In-Kind Support — may reduce this;
  // VTR logic is outside MVP scope but the FBR is the starting point)
  const step20 = fbr

  // Step 21: Subtract Total Countable Income from FBR
  const step21 = step20 - step19

  // Step 22: Adjusted SSI Payment — NEVER negative; floor at $0 — KEY RESULT ROW
  const step22 = floor0(step21)
  const triggers1619b = step22 === 0 && grossMonthlyWages > 0

  // ── TOTAL FINANCIAL OUTCOME ──────────────────────────────────────────────

  // Steps 23-27: Total financial outcome = SSI + all gross income - work expenses
  const step23 = step22                                  // Adjusted SSI Payment
  const step24 = profile.monthlyUnearnedIncome           // Gross unearned income received
  const step25 = grossMonthlyWages                       // Gross earned income received
  const step26 = irweApplied + bweApplied + passApplied  // Deductible work expenses
  const step27 = step23 + step24 + step25 - step26       // KEY RESULT ROW

  const steps: SSISteps = {
    step1_unearnedIncome: step1,
    step2_gieFromUnearned: step2,
    step3_countableUnearnedIncome: step3,
    step4_grossEarnedIncome: step4,
    step5_seie: step5,
    step6_remainder: step6,
    step7_gieFromEarned: step7,
    step8_remainder: step8,
    step9_eie: step9,
    step10_remainder: step10,
    step11_irwe: step11,
    step12_remainder: step12,
    step13_divideByTwo: step13,
    step14_bwe: step14,
    step15_totalCountableEarnedIncome: step15,
    step16_addCUI: step16,
    step17_addCEI: step17,
    step18_pass: step18,
    step19_totalCountableIncome: step19,
    step20_fbr: step20,
    step21_subtractCountableIncome: step21,
    step22_adjustedSSIPayment: step22,
    step23_adjustedSSIPayment: step23,
    step24_grossUnearnedIncome: step24,
    step25_grossEarnedIncome: step25,
    step26_deductions: step26,
    step27_totalFinancialOutcome: step27,
  }

  return {
    countableUnearnedIncome: step3,
    totalCountableEarnedIncome: step15,
    totalCountableIncome: step19,
    adjustedSSIPayment: step22,
    totalFinancialOutcome: step27,
    steps,
    triggers1619b,
    seieApplied,
    irweApplied,
    bweApplied,
    passApplied,
    gieAppliedToUnearned,
    gieAppliedToEarned,
  }
}
