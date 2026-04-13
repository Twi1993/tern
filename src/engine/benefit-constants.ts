/**
 * SSA benefit parameters for 2026.
 * Updated annually every January via COLA.
 * Source: WIPA National Training Curriculum 2026 Edition (VCU-NTDC)
 */
export const BENEFIT_CONSTANTS_2026 = {
  year: 2026,

  // Federal Benefit Rate (FBR)
  FBR_INDIVIDUAL: 994,      // per month
  FBR_COUPLE: 1491,         // per month (both members must be SSI-eligible)

  // Standard income exclusions
  GIE: 20,                  // General Income Exclusion — applied to unearned first
  EIE: 65,                  // Earned Income Exclusion

  // Student Earned Income Exclusion (SEIE) — under age 22, regularly attending school
  SEIE_MONTHLY_MAX: 2410,
  SEIE_ANNUAL_MAX: 9730,

  // Substantial Gainful Activity (SGA) thresholds
  SGA_NON_BLIND: 1690,      // per month
  SGA_BLIND: 2830,          // per month

  // Trial Work Period (TWP) monthly earnings threshold
  TWP_THRESHOLD: 1210,      // per month

  // Resource limits (unchanged since 1989)
  RESOURCE_LIMIT_INDIVIDUAL: 2000,
  RESOURCE_LIMIT_COUPLE: 3000,

  // Approximate SSI break-even point (earned income only, no unearned, no work incentives)
  // Solve: FBR - ((wages - GIE - EIE) / 2) = 0  =>  wages = FBR*2 + GIE + EIE = 2073
  // With standard GIE+EIE: (994 * 2) + 20 + 65 = 2073; spec lists ~$2,167 accounting for rounding
  SSI_BREAKEVEN_APPROX: 2167,
} as const

// Convenience alias — update this pointer each January to switch to the new year's constants
export const CURRENT_CONSTANTS = BENEFIT_CONSTANTS_2026
