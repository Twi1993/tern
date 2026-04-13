export type BenefitType = 'SSI' | 'SSDI' | 'CONCURRENT'
export type HouseholdType = 'INDIVIDUAL' | 'ELIGIBLE_COUPLE' | 'MINOR_CHILD'

export interface ClientProfile {
  benefitType: BenefitType
  householdType: HouseholdType
  state: string

  // Current benefit amounts
  monthlySSIPayment: number
  monthlySSDIPayment: number

  // Income
  monthlyUnearnedIncome: number  // non-SSI/SSDI unearned income

  // Work incentive flags and deductions
  isStudent: boolean             // eligible for SEIE (under 22, in school)
  isBlind: boolean               // statutory blindness — enables BWE, blind SGA threshold
  monthlyIRWE: number            // Impairment Related Work Expenses
  monthlyBWE: number             // Blind Work Expenses (blindness only, applied after ÷2)
  monthlyPASS: number            // Plan to Achieve Self-Support deduction

  // SEIE tracking (must not exceed annual cap)
  seieMonthlyUsed: number        // amount of SEIE applied this month
  seieAnnualUsed: number         // cumulative SEIE used this calendar year (before this month)

  // SSDI state machine
  twpMonthsUsed: number          // 0–9; in rolling 60-month window
  isInEPE: boolean               // whether client is currently in Extended Period of Eligibility
  epeStartMonth: string | null   // "YYYY-MM" format; null if EPE not started
  currentMonthlyEarnings: number // current actual gross earnings for SSDI TWP/SGA tracking
}

export interface SSICalculationResult {
  // Key result rows (Steps 3, 15, 19, 22, 27)
  countableUnearnedIncome: number    // Step 3
  totalCountableEarnedIncome: number // Step 15
  totalCountableIncome: number       // Step 19
  adjustedSSIPayment: number         // Step 22 (floored at $0)
  totalFinancialOutcome: number      // Step 27

  // All 27 intermediate values for display/audit
  steps: SSISteps

  // Flags
  triggers1619b: boolean             // true when adjustedSSIPayment = $0
  seieApplied: number
  irweApplied: number
  bweApplied: number
  passApplied: number
  gieAppliedToUnearned: number
  gieAppliedToEarned: number
}

export interface SSISteps {
  step1_unearnedIncome: number
  step2_gieFromUnearned: number
  step3_countableUnearnedIncome: number
  step4_grossEarnedIncome: number
  step5_seie: number
  step6_remainder: number
  step7_gieFromEarned: number
  step8_remainder: number
  step9_eie: number
  step10_remainder: number
  step11_irwe: number
  step12_remainder: number
  step13_divideByTwo: number
  step14_bwe: number
  step15_totalCountableEarnedIncome: number
  step16_addCUI: number
  step17_addCEI: number
  step18_pass: number
  step19_totalCountableIncome: number
  step20_fbr: number
  step21_subtractCountableIncome: number
  step22_adjustedSSIPayment: number
  step23_adjustedSSIPayment: number
  step24_grossUnearnedIncome: number
  step25_grossEarnedIncome: number
  step26_deductions: number
  step27_totalFinancialOutcome: number
}
