import { useState } from 'react'
import type { SSICalculationResult, SSISteps, ClientProfile } from '../types/index.ts'
import type { Medicaid1619bResult } from '../engine/medicaid-1619b.ts'
import { fmt, fmtExact, fmtDelta } from '../utils/format.ts'
import { STATE_1619B_THRESHOLDS_2026 } from '../engine/medicaid-1619b.ts'

interface Props {
  result: SSICalculationResult
  baselineOutcome: number      // totalFinancialOutcome at $0 wages
  medicaid: Medicaid1619bResult
  grossMonthlyWages: number
  profile: ClientProfile
}

// ── 27-step table definition ──────────────────────────────────────────────────

type StepKey = keyof SSISteps

interface StepDef {
  num: number
  key: StepKey
  label: string
  operator: string
  isKeyRow: boolean
}

const STEP_DEFS: StepDef[] = [
  { num: 1,  key: 'step1_unearnedIncome',              label: 'Unearned income',                              operator: '',   isKeyRow: false },
  { num: 2,  key: 'step2_gieFromUnearned',             label: 'General Income Exclusion — applied to unearned', operator: '−',  isKeyRow: false },
  { num: 3,  key: 'step3_countableUnearnedIncome',     label: 'Countable Unearned Income (CUI)',              operator: '=',  isKeyRow: true  },
  { num: 4,  key: 'step4_grossEarnedIncome',           label: 'Gross earned income',                          operator: '',   isKeyRow: false },
  { num: 5,  key: 'step5_seie',                        label: 'Student Earned Income Exclusion (SEIE)',       operator: '−',  isKeyRow: false },
  { num: 6,  key: 'step6_remainder',                   label: 'Remainder',                                    operator: '=',  isKeyRow: false },
  { num: 7,  key: 'step7_gieFromEarned',               label: 'GIE remainder — applied to earned income',    operator: '−',  isKeyRow: false },
  { num: 8,  key: 'step8_remainder',                   label: 'Remainder',                                    operator: '=',  isKeyRow: false },
  { num: 9,  key: 'step9_eie',                         label: 'Earned Income Exclusion (EIE) $65',           operator: '−',  isKeyRow: false },
  { num: 10, key: 'step10_remainder',                  label: 'Remainder',                                    operator: '=',  isKeyRow: false },
  { num: 11, key: 'step11_irwe',                       label: 'Impairment Related Work Expenses (IRWE)',      operator: '−',  isKeyRow: false },
  { num: 12, key: 'step12_remainder',                  label: 'Remainder',                                    operator: '=',  isKeyRow: false },
  { num: 13, key: 'step13_divideByTwo',                label: 'Divide by 2 (one-for-two offset)',            operator: '÷2', isKeyRow: false },
  { num: 14, key: 'step14_bwe',                        label: 'Blind Work Expenses (BWE)',                    operator: '−',  isKeyRow: false },
  { num: 15, key: 'step15_totalCountableEarnedIncome', label: 'Total Countable Earned Income (CEI)',          operator: '=',  isKeyRow: true  },
  { num: 16, key: 'step16_addCUI',                     label: 'Add Countable Unearned Income (Step 3)',       operator: '+',  isKeyRow: false },
  { num: 17, key: 'step17_addCEI',                     label: 'Add Countable Earned Income (Step 15)',        operator: '+',  isKeyRow: false },
  { num: 18, key: 'step18_pass',                       label: 'PASS Deduction',                               operator: '−',  isKeyRow: false },
  { num: 19, key: 'step19_totalCountableIncome',       label: 'Total Countable Income',                       operator: '=',  isKeyRow: true  },
  { num: 20, key: 'step20_fbr',                        label: 'Federal Benefit Rate (FBR)',                   operator: '',   isKeyRow: false },
  { num: 21, key: 'step21_subtractCountableIncome',    label: 'FBR − Total Countable Income',                 operator: '−',  isKeyRow: false },
  { num: 22, key: 'step22_adjustedSSIPayment',         label: 'Adjusted SSI Payment',                         operator: '=',  isKeyRow: true  },
  { num: 23, key: 'step23_adjustedSSIPayment',         label: 'Adjusted SSI Payment',                         operator: '',   isKeyRow: false },
  { num: 24, key: 'step24_grossUnearnedIncome',        label: 'Gross Unearned Income Received',               operator: '+',  isKeyRow: false },
  { num: 25, key: 'step25_grossEarnedIncome',          label: 'Gross Earned Income Received',                 operator: '+',  isKeyRow: false },
  { num: 26, key: 'step26_deductions',                 label: 'Work Expenses (IRWE + BWE + PASS)',            operator: '−',  isKeyRow: false },
  { num: 27, key: 'step27_totalFinancialOutcome',      label: 'Total Financial Outcome',                      operator: '=',  isKeyRow: true  },
]

// ── 1619(b) badge ─────────────────────────────────────────────────────────────

function MedicaidBadge({ medicaid, state }: { medicaid: Medicaid1619bResult; state: string }) {
  if (medicaid.status === 'NOT_APPLICABLE') {
    const threshold = STATE_1619B_THRESHOLDS_2026[state.toUpperCase()]
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
          1619(b) Medicaid: N/A
        </span>
        {threshold && (
          <span>{state} threshold: {fmt(threshold)}/yr</span>
        )}
      </div>
    )
  }

  const config = {
    SAFE:            { bg: 'bg-tern-teal/10',  text: 'text-tern-teal',  label: '✓ 1619(b) SAFE' },
    AT_RISK:         { bg: 'bg-amber-100',      text: 'text-amber-800',  label: '⚠ 1619(b) AT RISK' },
    OVER_THRESHOLD:  { bg: 'bg-red-100',        text: 'text-red-800',    label: '✕ 1619(b) OVER THRESHOLD' },
  }[medicaid.status]

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        {medicaid.stateThreshold !== null && (
          <span className="text-xs text-gray-500">
            {state} threshold: {fmt(medicaid.stateThreshold)}/yr
            {' · '}est. annual countable: {fmt(medicaid.estimatedAnnualCountableEarnings)}
          </span>
        )}
      </div>
      {medicaid.warning && medicaid.status !== 'SAFE' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          {medicaid.warning}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SSICalculatorOutput({ result, baselineOutcome, medicaid, grossMonthlyWages, profile }: Props) {
  const [stepsOpen, setStepsOpen] = useState(false)

  const netGain = result.totalFinancialOutcome - baselineOutcome
  const ssiIsZero = result.adjustedSSIPayment === 0 && grossMonthlyWages > 0
  const showSSI = profile.benefitType === 'SSI' || profile.benefitType === 'CONCURRENT'

  if (!showSSI) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500">
        SSI calculation not applicable — client receives SSDI only. See the SSDI Employment Tracker above.
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="New SSI Payment"
          value={fmt(result.adjustedSSIPayment)}
          sub={ssiIsZero ? '1619(b) Medicaid may apply' : undefined}
          highlight={ssiIsZero ? 'zero' : 'normal'}
        />
        <MetricCard
          label="Total Financial Outcome"
          value={fmt(result.totalFinancialOutcome)}
          sub="SSI + wages + unearned − expenses"
          highlight="normal"
        />
        <MetricCard
          label="Net Gain from Working"
          value={fmtDelta(netGain)}
          sub="vs. not working"
          highlight={netGain > 0 ? 'positive' : netGain < 0 ? 'negative' : 'normal'}
        />
      </div>

      {/* Wage reporting reminder */}
      {grossMonthlyWages > 0 && (
        <div className="bg-tern-ice border border-tern-navy/20 rounded-lg px-4 py-2.5 text-xs text-tern-navy">
          <strong>Wage reporting reminder:</strong> SSI recipients must report these earnings ({fmt(grossMonthlyWages)}/mo)
          to SSA by the 10th of next month. Wages can be reported at{' '}
          <span className="font-medium">ssa.gov/myaccount</span> or by calling{' '}
          <span className="font-medium">1-800-772-1213</span>.
        </div>
      )}

      {/* 1619(b) Medicaid status */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
        <MedicaidBadge medicaid={medicaid} state={profile.state} />
      </div>

      {/* Work incentives applied */}
      {(result.seieApplied > 0 || result.irweApplied > 0 || result.bweApplied > 0 || result.passApplied > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Incentives Applied</p>
          <div className="flex gap-4 flex-wrap text-xs">
            {result.seieApplied > 0 && (
              <span className="text-tern-teal">SEIE: {fmt(result.seieApplied)} excluded</span>
            )}
            {result.irweApplied > 0 && (
              <span className="text-tern-teal">IRWE: {fmt(result.irweApplied)} deducted (saved ~{fmt(result.irweApplied / 2)} in SSI)</span>
            )}
            {result.bweApplied > 0 && (
              <span className="text-tern-teal">BWE: {fmt(result.bweApplied)} deducted</span>
            )}
            {result.passApplied > 0 && (
              <span className="text-tern-teal">PASS: {fmt(result.passApplied)} deducted</span>
            )}
          </div>
        </div>
      )}

      {/* 27-step collapsible */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setStepsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>WIPA 27-Step Calculation Sheet</span>
          <span className="text-gray-400 text-xs">{stepsOpen ? '▲ collapse' : '▼ expand to verify'}</span>
        </button>

        {stepsOpen && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-t border-gray-100">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">Step</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-8">Op</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {STEP_DEFS.map(step => {
                  const rawValue = result.steps[step.key]
                  const isFloored = step.num === 22 && result.steps.step21_subtractCountableIncome < 0
                  return (
                    <tr
                      key={step.num}
                      className={step.isKeyRow ? 'bg-tern-navy/5 font-semibold' : 'hover:bg-gray-50'}
                    >
                      <td className="px-3 py-1.5 text-gray-400">{step.num}</td>
                      <td className="px-3 py-1.5 text-gray-700">
                        {step.label}
                        {isFloored && (
                          <span className="ml-1 text-amber-600">(floored to $0 — see Step 21)</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center text-gray-400">{step.operator}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${step.isKeyRow ? 'text-tern-navy' : 'text-gray-800'}`}>
                        {fmtExact(rawValue)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              Source: WIPA National Training Curriculum 2026 Edition, Ch. 3, pp. 18–21.
              Note: SSA uses Retrospective Monthly Accounting — 2-month lag between income and adjusted payment.
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-800">
        <strong>Note:</strong> Tern provides estimates only. Social Security has final authority on all benefit
        calculations and determinations. Consult a certified CWIC or Social Security representative before making
        employment decisions.
      </div>

    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

type Highlight = 'normal' | 'positive' | 'negative' | 'zero'

function MetricCard({ label, value, sub, highlight }: {
  label: string
  value: string
  sub?: string
  highlight: Highlight
}) {
  const valueColor = {
    normal:   'text-gray-900',
    positive: 'text-tern-teal',
    negative: 'text-red-700',
    zero:     'text-amber-700',
  }[highlight]

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
