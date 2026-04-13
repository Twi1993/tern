/**
 * Scenario Engine — combines all calculation modules into a single output.
 * Takes a job offer + client profile → runs full SSI/SSDI/1619(b) analysis.
 *
 * This is the "what-if moment" that makes ClearPath valuable:
 * specialist enters $16/hr × 30 hrs → sees all benefit impacts instantly.
 */

import { calculateSSI } from './ssi-calculator.ts'
import { evaluateSSDIStatus } from './ssdi-tracker.ts'
import { evaluate1619b } from './medicaid-1619b.ts'
import type { ClientProfile, SSICalculationResult } from '../types/index.ts'
import type { SSDIStatus } from './ssdi-tracker.ts'
import type { Medicaid1619bResult } from './medicaid-1619b.ts'

export interface JobScenario {
  employerName: string
  jobTitle: string
  grossHourlyWage: number
  hoursPerWeek: number
  /** Derived from wage × hours × (52/12) */
  grossMonthlyWages: number
}

export interface ScenarioResult {
  scenario: JobScenario
  ssi: SSICalculationResult | null        // null if benefitType is SSDI-only
  ssdi: SSDIStatus | null                 // null if benefitType is SSI-only
  medicaid1619b: Medicaid1619bResult
  netFinancialGain: number                // Step 27 minus current baseline income
  warnings: string[]
}

export function runScenario(
  profile: ClientProfile,
  scenario: Partial<JobScenario> & { grossHourlyWage: number; hoursPerWeek: number },
): ScenarioResult {
  // Calculate monthly gross: hourly × hours/week × 52 weeks / 12 months
  const grossMonthlyWages = (scenario.grossHourlyWage * scenario.hoursPerWeek * 52) / 12

  const fullScenario: JobScenario = {
    employerName: scenario.employerName ?? '',
    jobTitle: scenario.jobTitle ?? '',
    grossHourlyWage: scenario.grossHourlyWage,
    hoursPerWeek: scenario.hoursPerWeek,
    grossMonthlyWages,
  }

  const warnings: string[] = []

  // SSI calculation
  let ssiResult: SSICalculationResult | null = null
  if (profile.benefitType === 'SSI' || profile.benefitType === 'CONCURRENT') {
    ssiResult = calculateSSI(profile, grossMonthlyWages)
  }

  // SSDI state machine
  let ssdiBenefitStatus: SSDIStatus | null = null
  if (profile.benefitType === 'SSDI' || profile.benefitType === 'CONCURRENT') {
    ssdiBenefitStatus = evaluateSSDIStatus(profile, grossMonthlyWages)
    if (ssdiBenefitStatus.warning) {
      warnings.push(ssdiBenefitStatus.warning)
    }
  }

  // 1619(b) Medicaid check (SSI recipients only)
  const adjustedSSIPayment = ssiResult?.adjustedSSIPayment ?? 0
  const medicaid1619b = evaluate1619b(
    profile.state,
    grossMonthlyWages,
    profile.monthlyIRWE,
    profile.monthlyBWE,
    profile.monthlyPASS,
    adjustedSSIPayment,
  )
  if (medicaid1619b.warning) {
    warnings.push(medicaid1619b.warning)
  }

  // Net financial gain vs. current baseline (no work)
  const currentBaseline = profile.monthlySSIPayment + profile.monthlySSDIPayment + profile.monthlyUnearnedIncome
  const totalFinancialOutcome = ssiResult?.totalFinancialOutcome ?? (profile.monthlySSDIPayment + grossMonthlyWages)
  const netFinancialGain = totalFinancialOutcome - currentBaseline

  // Wage reporting reminder
  warnings.push('Reminder: earnings must be reported to SSA by the 10th of each month.')

  return {
    scenario: fullScenario,
    ssi: ssiResult,
    ssdi: ssdiBenefitStatus,
    medicaid1619b,
    netFinancialGain,
    warnings,
  }
}
