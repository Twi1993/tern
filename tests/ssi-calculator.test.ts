/**
 * SSI Calculator unit tests
 * Validated against WIPA National Training Curriculum 2026 worked examples.
 *
 * NOTE on the $317 wage example: the WIPA manual uses the historical FBR of $967
 * (pre-2026). We test the arithmetic directly (countable income = $116) and
 * verify that the 2026 FBR yields the correct adjusted payment under 2026 values.
 */

import { describe, it, expect } from 'vitest'
import { calculateSSI } from '../src/engine/ssi-calculator.ts'
import { CURRENT_CONSTANTS } from '../src/engine/benefit-constants.ts'
import type { ClientProfile } from '../src/types/index.ts'

/** A minimal "clean" individual SSI profile with no work incentives. */
const baseProfile: ClientProfile = {
  benefitType: 'SSI',
  householdType: 'INDIVIDUAL',
  state: 'PA',
  monthlySSIPayment: CURRENT_CONSTANTS.FBR_INDIVIDUAL,
  monthlySSDIPayment: 0,
  monthlyUnearnedIncome: 0,
  isStudent: false,
  isBlind: false,
  monthlyIRWE: 0,
  monthlyBWE: 0,
  monthlyPASS: 0,
  seieMonthlyUsed: 0,
  seieAnnualUsed: 0,
  twpMonthsUsed: 0,
  isInEPE: false,
  epeStartMonth: null,
  currentMonthlyEarnings: 0,
}

describe('SSI Calculator — 27-step calculation sheet', () => {

  // ── WIPA CHAPTER 3 EXAMPLE: $317 gross wages, no unearned income ───────────
  // Manual uses FBR $967 (historical). We verify the countable income arithmetic
  // is correct (the part independent of FBR), then check 2026 payment separately.
  describe('WIPA Chapter 3 worked example — $317 gross wages', () => {
    const result = calculateSSI(baseProfile, 317)

    it('Step 1: unearned income = $0', () => {
      expect(result.steps.step1_unearnedIncome).toBe(0)
    })

    it('Step 3: countable unearned income = $0', () => {
      expect(result.countableUnearnedIncome).toBe(0)
    })

    it('GIE fully rolls to earned income when no unearned income', () => {
      expect(result.gieAppliedToUnearned).toBe(0)
      expect(result.gieAppliedToEarned).toBe(20)
    })

    it('Step 4: gross earned income = $317', () => {
      expect(result.steps.step4_grossEarnedIncome).toBe(317)
    })

    it('Step 8: remainder after GIE = $297  (317 - 20)', () => {
      expect(result.steps.step8_remainder).toBe(297)
    })

    it('Step 10: remainder after EIE = $232  (297 - 65)', () => {
      expect(result.steps.step10_remainder).toBe(232)
    })

    it('Step 13: after ÷2 = $116  (232 / 2)', () => {
      expect(result.steps.step13_divideByTwo).toBe(116)
    })

    it('Step 15: Total Countable Earned Income = $116', () => {
      expect(result.totalCountableEarnedIncome).toBe(116)
    })

    it('Step 19: Total Countable Income = $116', () => {
      expect(result.totalCountableIncome).toBe(116)
    })

    // With 2026 FBR ($994): adjusted SSI = 994 - 116 = $878
    it('Step 22: Adjusted SSI Payment = $878 under 2026 FBR ($994 - $116)', () => {
      expect(result.adjustedSSIPayment).toBe(878)
    })

    // Total financial outcome: $878 SSI + $317 wages = $1,195
    it('Step 27: Total financial outcome = $1,195  ($878 + $317)', () => {
      expect(result.totalFinancialOutcome).toBe(1195)
    })

    it('Does not trigger 1619(b) (SSI payment > $0)', () => {
      expect(result.triggers1619b).toBe(false)
    })
  })

  // ── ZERO EARNINGS — full FBR ───────────────────────────────────────────────
  describe('Client earning $0 — receives full FBR', () => {
    const result = calculateSSI(baseProfile, 0)

    it('Countable income = $0', () => {
      expect(result.totalCountableIncome).toBe(0)
    })

    it('SSI payment = FBR ($994)', () => {
      expect(result.adjustedSSIPayment).toBe(CURRENT_CONSTANTS.FBR_INDIVIDUAL)
      expect(result.adjustedSSIPayment).toBe(994)
    })

    it('Does not trigger 1619(b)', () => {
      expect(result.triggers1619b).toBe(false)
    })

    it('Total financial outcome = $994', () => {
      expect(result.totalFinancialOutcome).toBe(994)
    })
  })

  // ── BREAK-EVEN — SSI payment = $0 ─────────────────────────────────────────
  // Break-even formula: wages where (wages - GIE - EIE) / 2 = FBR
  // => wages = FBR * 2 + GIE + EIE = 994 * 2 + 20 + 65 = 2073
  describe('Client at break-even — SSI payment = $0', () => {
    const breakEvenWage = CURRENT_CONSTANTS.FBR_INDIVIDUAL * 2 + CURRENT_CONSTANTS.GIE + CURRENT_CONSTANTS.EIE
    const result = calculateSSI(baseProfile, breakEvenWage)

    it('Countable income equals FBR exactly at break-even', () => {
      expect(result.totalCountableIncome).toBe(CURRENT_CONSTANTS.FBR_INDIVIDUAL)
    })

    it('SSI payment = $0 at break-even ($2,073 gross wages)', () => {
      expect(breakEvenWage).toBe(2073)
      expect(result.adjustedSSIPayment).toBe(0)
    })

    it('Triggers 1619(b) check when SSI = $0 and wages > $0', () => {
      expect(result.triggers1619b).toBe(true)
    })
  })

  // ── APPROXIMATE BREAK-EVEN from spec (~$2,167) ────────────────────────────
  describe('Spec break-even approximation (~$2,167)', () => {
    it('SSI payment = $0 at $2,167 gross wages', () => {
      const result = calculateSSI(baseProfile, 2167)
      expect(result.adjustedSSIPayment).toBe(0)
    })
  })

  // ── GIE APPLIED TO UNEARNED FIRST ─────────────────────────────────────────
  describe('GIE application order — unearned income present', () => {
    const profileWithUnearned: ClientProfile = {
      ...baseProfile,
      monthlyUnearnedIncome: 50,
    }

    it('Full $20 GIE applied to unearned when unearned >= $20', () => {
      const result = calculateSSI(profileWithUnearned, 300)
      expect(result.gieAppliedToUnearned).toBe(20)
      expect(result.gieAppliedToEarned).toBe(0)
    })

    it('Partial GIE to unearned; remainder to earned when unearned < $20', () => {
      const profileLowUnearned: ClientProfile = {
        ...baseProfile,
        monthlyUnearnedIncome: 10,
      }
      const result = calculateSSI(profileLowUnearned, 300)
      expect(result.gieAppliedToUnearned).toBe(10)
      expect(result.gieAppliedToEarned).toBe(10)
    })

    it('Countable unearned income = unearned - GIE', () => {
      const result = calculateSSI(profileWithUnearned, 0)
      expect(result.countableUnearnedIncome).toBe(30)  // 50 - 20
    })
  })

  // ── IRWE reduces countable income BEFORE ÷2 ───────────────────────────────
  describe('IRWE deducted before one-for-two offset (Step 11)', () => {
    const profileWithIRWE: ClientProfile = {
      ...baseProfile,
      monthlyIRWE: 100,
    }

    it('IRWE of $100 reduces countable income; beneficiary recovers ~$50 in SSI', () => {
      const withIRWE = calculateSSI(profileWithIRWE, 500)
      const withoutIRWE = calculateSSI(baseProfile, 500)
      // With IRWE: countable earned = (500-20-65-100)/2 = 157.5 → SSI = 994-157.5 = 836.5
      // Without IRWE: countable earned = (500-20-65)/2 = 207.5 → SSI = 994-207.5 = 786.5
      // Difference should be ~$50 (IRWE ÷ 2)
      expect(withIRWE.adjustedSSIPayment - withoutIRWE.adjustedSSIPayment).toBeCloseTo(50, 0)
    })
  })

  // ── BWE after ÷2 (blindness only) ─────────────────────────────────────────
  describe('BWE deducted AFTER one-for-two offset (Step 14)', () => {
    const blindProfile: ClientProfile = {
      ...baseProfile,
      isBlind: true,
      monthlyBWE: 100,
    }

    it('BWE of $100 reduces countable earned income dollar-for-dollar (after ÷2)', () => {
      const withBWE = calculateSSI(blindProfile, 500)
      const withoutBWE = calculateSSI({ ...blindProfile, monthlyBWE: 0 }, 500)
      expect(withBWE.adjustedSSIPayment - withoutBWE.adjustedSSIPayment).toBe(100)
    })

    it('BWE not applied for non-blind recipients', () => {
      const nonBlindWithBWE: ClientProfile = {
        ...baseProfile,
        isBlind: false,
        monthlyBWE: 100,
      }
      const result = calculateSSI(nonBlindWithBWE, 500)
      expect(result.bweApplied).toBe(0)
    })
  })

  // ── SEIE tracking ─────────────────────────────────────────────────────────
  describe('SEIE — Student Earned Income Exclusion', () => {
    const studentProfile: ClientProfile = {
      ...baseProfile,
      isStudent: true,
      seieAnnualUsed: 0,
    }

    it('SEIE applied before GIE/EIE for eligible students', () => {
      // $500 wages: SEIE covers all $500; no countable earned income
      const result = calculateSSI(studentProfile, 500)
      expect(result.seieApplied).toBe(500)
      expect(result.totalCountableEarnedIncome).toBe(0)
    })

    it('SEIE capped at monthly max ($2,410)', () => {
      const result = calculateSSI(studentProfile, 3000)
      expect(result.seieApplied).toBe(CURRENT_CONSTANTS.SEIE_MONTHLY_MAX)
    })

    it('SEIE respects annual cap', () => {
      const nearCapProfile: ClientProfile = {
        ...studentProfile,
        seieAnnualUsed: 9500,  // only $230 remaining before $9,730 cap
      }
      const result = calculateSSI(nearCapProfile, 1000)
      expect(result.seieApplied).toBe(230)  // only $230 remaining
    })

    it('Non-students do not receive SEIE', () => {
      const result = calculateSSI(baseProfile, 500)
      expect(result.seieApplied).toBe(0)
    })
  })

  // ── ELIGIBLE COUPLE uses couple FBR ───────────────────────────────────────
  describe('Eligible couple uses FBR_COUPLE', () => {
    const coupleProfile: ClientProfile = {
      ...baseProfile,
      householdType: 'ELIGIBLE_COUPLE',
    }

    it('SSI payment at $0 wages = FBR_COUPLE ($1,491)', () => {
      const result = calculateSSI(coupleProfile, 0)
      expect(result.adjustedSSIPayment).toBe(CURRENT_CONSTANTS.FBR_COUPLE)
    })
  })

  // ── SSI payment never goes negative ───────────────────────────────────────
  describe('SSI payment floored at $0', () => {
    it('Very high wages → SSI = $0, never negative', () => {
      const result = calculateSSI(baseProfile, 10000)
      expect(result.adjustedSSIPayment).toBe(0)
      expect(result.triggers1619b).toBe(true)
    })
  })

})
