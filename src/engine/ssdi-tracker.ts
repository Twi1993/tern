/**
 * SSDI Trial Work Period / Extended Period of Eligibility / SGA State Machine
 * Source: WIPA National Training Curriculum 2026 Edition, Chapter 1
 *
 * States: PRE_TWP → TWP → GRACE_PERIOD → EPE → TERMINATED (or EXR eligible)
 *
 * Key rules:
 * - TWP months do NOT have to be consecutive; they accumulate in a rolling 60-month window
 * - TWP threshold (2026): $1,210/month (gross wages — not IRWE-adjusted)
 * - SGA threshold (2026): $1,690 non-blind; $2,830 blind (IRWE reduces countable earnings)
 * - Grace period: cessation month + 2 months (full benefits paid)
 * - EPE: 36 months — benefits paid any month countable earnings < SGA
 * - EXR: up to 5 years post-termination; same/related disability
 */

import { CURRENT_CONSTANTS } from './benefit-constants.ts'
import type { ClientProfile } from '../types/index.ts'

export type SSDIState =
  | 'PRE_TWP'
  | 'TWP'
  | 'GRACE_PERIOD'
  | 'EPE'
  | 'TERMINATED'
  | 'EXR_ELIGIBLE'

export interface SSDIStatus {
  state: SSDIState
  twpMonthsUsed: number
  twpMonthsRemaining: number
  epeMonthsElapsed: number | null   // null if not in EPE
  epeMonthsRemaining: number | null // null if not in EPE
  benefitsPaidThisMonth: boolean
  sgaExceeded: boolean               // based on countable earnings (gross − IRWE)
  countableEarnings: number          // gross − IRWE, used for SGA determination
  twpMonthTriggered: boolean         // based on gross earnings
  warning: string | null
}

/** Parse "YYYY-MM" into { year, month } without relying on Date parsing */
function parseYearMonth(ym: string): { year: number; month: number } {
  const [yearStr, monthStr] = ym.split('-')
  return { year: Number(yearStr), month: Number(monthStr) }
}

/** Months elapsed since a "YYYY-MM" start month (clamped to 0) */
export function monthsElapsedSince(startMonth: string): number {
  const { year, month } = parseYearMonth(startMonth)
  const now = new Date()
  const elapsed = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  return Math.max(0, elapsed)
}

/** Format a "YYYY-MM" value as a human-readable month/year */
export function formatYearMonth(ym: string): string {
  const { year, month } = parseYearMonth(ym)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/** Add N months to a "YYYY-MM" string and return formatted result */
export function addMonths(ym: string, months: number): string {
  const { year, month } = parseYearMonth(ym)
  const totalMonths = (year * 12 + month - 1) + months
  const endYear = Math.floor(totalMonths / 12)
  const endMonth = (totalMonths % 12) + 1
  return new Date(endYear, endMonth - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function evaluateSSDIStatus(
  profile: ClientProfile,
  grossMonthlyWages: number,
): SSDIStatus {
  const C = CURRENT_CONSTANTS
  const sgaThreshold = profile.isBlind ? C.SGA_BLIND : C.SGA_NON_BLIND

  // TWP trigger: based on GROSS wages (IRWE does not apply to TWP threshold check)
  const twpMonthTriggered = grossMonthlyWages > C.TWP_THRESHOLD

  // SGA determination: IRWE reduces countable earnings
  const countableEarnings = Math.max(0, grossMonthlyWages - profile.monthlyIRWE)
  const sgaExceeded = countableEarnings > sgaThreshold

  // EPE progress
  let epeMonthsElapsed: number | null = null
  let epeMonthsRemaining: number | null = null
  if (profile.isInEPE && profile.epeStartMonth) {
    epeMonthsElapsed = Math.min(36, monthsElapsedSince(profile.epeStartMonth))
    epeMonthsRemaining = Math.max(0, 36 - epeMonthsElapsed)
  }

  const twpMonthsUsed = profile.twpMonthsUsed
  const twpComplete = twpMonthsUsed >= 9

  let state: SSDIState
  let benefitsPaidThisMonth: boolean
  let warning: string | null = null

  if (!twpComplete) {
    state = twpMonthsUsed === 0 ? 'PRE_TWP' : 'TWP'
    benefitsPaidThisMonth = true
    if (twpMonthTriggered) {
      warning = `This month counts as TWP month ${twpMonthsUsed + 1} of 9.`
    }
  } else if (!profile.isInEPE) {
    // TWP complete but EPE not yet started → Grace Period
    state = 'GRACE_PERIOD'
    benefitsPaidThisMonth = true
    warning = 'In grace period — benefits paid for cessation month plus 2 additional months.'
  } else if (epeMonthsRemaining !== null && epeMonthsRemaining > 0) {
    state = 'EPE'
    benefitsPaidThisMonth = !sgaExceeded
    if (sgaExceeded) {
      warning = `Countable earnings ($${countableEarnings.toLocaleString()}/mo) exceed SGA ($${sgaThreshold.toLocaleString()}/mo) — benefits suspended this month.`
    }
    if (epeMonthsRemaining <= 3) {
      warning = (warning ?? '') + ` EPE ends in ${epeMonthsRemaining} month(s) — plan carefully.`
    }
  } else {
    state = 'TERMINATED'
    benefitsPaidThisMonth = false
    warning = 'Benefits terminated. May be eligible for Expedited Reinstatement (EXR) within 5 years if unable to perform SGA.'
  }

  return {
    state,
    twpMonthsUsed,
    twpMonthsRemaining: Math.max(0, 9 - twpMonthsUsed),
    epeMonthsElapsed,
    epeMonthsRemaining,
    benefitsPaidThisMonth,
    sgaExceeded,
    countableEarnings,
    twpMonthTriggered,
    warning,
  }
}
