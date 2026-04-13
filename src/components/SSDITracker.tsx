/**
 * SSDI Employment Tracker — Sprint 4
 * Shows TWP progress, SGA risk, EPE status, and a plain-language summary.
 * Only rendered when benefitType is SSDI or CONCURRENT.
 */

import { evaluateSSDIStatus, formatYearMonth, addMonths, monthsElapsedSince } from '../engine/ssdi-tracker.ts'
import type { SSDIState, SSDIStatus } from '../engine/ssdi-tracker.ts'
import { CURRENT_CONSTANTS } from '../engine/benefit-constants.ts'
import type { ClientProfile } from '../types/index.ts'
import { fmt } from '../utils/format.ts'

interface Props {
  profile: ClientProfile
}

// ── TWP progress bar ──────────────────────────────────────────────────────────

function TWPProgress({ used }: { used: number }) {
  const badge =
    used <= 6
      ? { text: 'TWP Active — working freely', cls: 'bg-green-100 text-green-800' }
      : used <= 8
        ? { text: 'TWP Almost Exhausted — plan ahead', cls: 'bg-amber-100 text-amber-800' }
        : { text: 'TWP Complete — SGA rules now apply', cls: 'bg-red-100 text-red-800' }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Trial Work Period
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.text}
        </span>
      </div>

      {/* 9-segment bar */}
      <div className="flex gap-1.5">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-7 rounded flex items-center justify-center text-xs font-bold ${
              i < used ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{used} of 9 months used</span>
        <span>{Math.max(0, 9 - used)} remaining</span>
      </div>
    </div>
  )
}

// ── SGA risk ──────────────────────────────────────────────────────────────────

function SGARisk({
  profile,
  status,
}: {
  profile: ClientProfile
  status: SSDIStatus
}) {
  const C = CURRENT_CONSTANTS
  const sgaThreshold = profile.isBlind ? C.SGA_BLIND : C.SGA_NON_BLIND
  const earnings = profile.currentMonthlyEarnings

  let riskBadge: { text: string; cls: string }
  if (!status.sgaExceeded) {
    riskBadge = { text: 'Below SGA — benefits safe', cls: 'bg-tern-teal/10 text-tern-teal' }
  } else if (status.state === 'TWP' || status.state === 'PRE_TWP') {
    riskBadge = { text: 'Above SGA — protected by TWP', cls: 'bg-amber-100 text-amber-800' }
  } else if (status.state === 'GRACE_PERIOD') {
    riskBadge = { text: 'Above SGA — protected by Grace Period', cls: 'bg-amber-100 text-amber-800' }
  } else if (status.state === 'EPE') {
    riskBadge = { text: 'Above SGA — benefits suspended this month', cls: 'bg-red-100 text-red-800' }
  } else {
    riskBadge = { text: 'Above SGA — benefits at risk', cls: 'bg-red-100 text-red-800' }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          SGA Risk Assessment
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskBadge.cls}`}>
          {riskBadge.text}
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs space-y-1 font-mono">
        <div className="flex justify-between">
          <span className="text-gray-500">Gross earnings</span>
          <span className="text-gray-800">{fmt(earnings)}/mo</span>
        </div>
        {profile.monthlyIRWE > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">IRWE deductions</span>
            <span className="text-tern-teal">− {fmt(profile.monthlyIRWE)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
          <span className="text-gray-600">Countable earnings</span>
          <span className="text-gray-900">{fmt(status.countableEarnings)}/mo</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>SGA threshold ({profile.isBlind ? 'blind' : 'non-blind'})</span>
          <span>{fmt(sgaThreshold)}/mo</span>
        </div>
      </div>
    </div>
  )
}

// ── EPE status ────────────────────────────────────────────────────────────────

function EPEStatus({
  profile,
  status,
}: {
  profile: ClientProfile
  status: SSDIStatus
}) {
  const C = CURRENT_CONSTANTS
  const sgaThreshold = profile.isBlind ? C.SGA_BLIND : C.SGA_NON_BLIND

  if (!profile.isInEPE || !profile.epeStartMonth) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Extended Period of Eligibility
        </p>
        <p className="text-xs text-gray-500">
          EPE begins the month after the 9th TWP month is used. Mark "Client is currently in EPE"
          above and enter the start month to enable EPE tracking.
        </p>
      </div>
    )
  }

  const elapsed = status.epeMonthsElapsed ?? monthsElapsedSince(profile.epeStartMonth)
  const remaining = status.epeMonthsRemaining ?? Math.max(0, 36 - elapsed)
  const epeEndDate = addMonths(profile.epeStartMonth, 35) // 36th month = index 35
  const epeExpired = remaining === 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Extended Period of Eligibility
        </p>
        {epeExpired ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
            EPE Expired
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tern-navy/10 text-tern-navy">
            Month {elapsed} of 36
          </span>
        )}
      </div>

      {/* 36-segment progress bar */}
      <div className="flex gap-px flex-wrap">
        {Array.from({ length: 36 }, (_, i) => (
          <div
            key={i}
            className={`h-4 rounded-sm ${
              i < elapsed
                ? i >= 33
                  ? 'bg-red-400'
                  : 'bg-tern-navy'
                : 'bg-gray-100'
            }`}
            style={{ width: 'calc(100% / 36 - 1px)' }}
            title={`Month ${i + 1}`}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Started: {formatYearMonth(profile.epeStartMonth)}</span>
        <span>{remaining} months remaining</span>
        <span>Ends: {epeEndDate}</span>
      </div>

      {epeExpired ? (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-800">
          EPE has ended. If the client is unable to perform SGA due to the same or related disability,
          they may be eligible for <strong>Expedited Reinstatement (EXR)</strong> within 5 years of
          termination. Contact SSA or a CWIC immediately.
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          During EPE, benefits resume automatically in any month countable earnings fall below{' '}
          {fmt(sgaThreshold)}/mo. No new application needed.
        </p>
      )}
    </div>
  )
}

// ── Plain language summary ────────────────────────────────────────────────────

function buildSummary(status: SSDIStatus, profile: ClientProfile): string {
  const C = CURRENT_CONSTANTS
  const sgaThreshold = profile.isBlind ? C.SGA_BLIND : C.SGA_NON_BLIND
  const countable = status.countableEarnings
  const elapsed = status.epeMonthsElapsed

  switch (status.state as SSDIState) {
    case 'PRE_TWP':
      return `Client has not yet used any Trial Work Period months. SSDI benefits are fully protected — ` +
        `earnings have no effect until a month where gross earnings exceed ${fmt(C.TWP_THRESHOLD)}, ` +
        `which would count as TWP month 1 of 9.`

    case 'TWP':
      if (status.twpMonthsUsed >= 7) {
        return `Client has used ${status.twpMonthsUsed} of 9 Trial Work Period months — ` +
          `only ${status.twpMonthsRemaining} month(s) remain. SSDI is still fully protected, but ` +
          `SGA rules will apply soon. Plan now: if countable earnings exceed ${fmt(sgaThreshold)}/mo ` +
          `after TWP ends, the Grace Period begins and benefits will eventually be at risk.`
      }
      return `Client has used ${status.twpMonthsUsed} of 9 Trial Work Period months. ` +
        `SSDI benefits are fully protected during the TWP regardless of earnings level. ` +
        `${status.twpMonthsRemaining} TWP months remain (any month gross earnings exceed ${fmt(C.TWP_THRESHOLD)}).`

    case 'GRACE_PERIOD':
      return `Client's Trial Work Period is complete. They are in the Grace Period — SSDI benefits ` +
        `are paid for the cessation month plus 2 additional months regardless of earnings. ` +
        `After the Grace Period, the 36-month Extended Period of Eligibility (EPE) begins. ` +
        `Update the EPE start month above to enable EPE tracking.`

    case 'EPE': {
      const monthNum = elapsed !== null ? elapsed : '?'
      if (countable > sgaThreshold) {
        return `Client is in month ${monthNum} of their 36-month Extended Period of Eligibility ` +
          `and countable earnings (${fmt(countable)}/mo) exceed SGA (${fmt(sgaThreshold)}/mo). ` +
          `SSDI benefits are suspended this month. Benefits will resume automatically in any future ` +
          `month countable earnings fall below ${fmt(sgaThreshold)}/mo — no new application needed.`
      }
      return `Client is in month ${monthNum} of their 36-month Extended Period of Eligibility. ` +
        `Countable earnings (${fmt(countable)}/mo) are below SGA (${fmt(sgaThreshold)}/mo) — ` +
        `SSDI benefits are being paid this month. Benefits will automatically suspend in any month ` +
        `countable earnings exceed ${fmt(sgaThreshold)}/mo.`
    }

    case 'TERMINATED':
      return `Client's SSDI benefits have been terminated due to earnings exceeding SGA after the EPE. ` +
        `If they are still experiencing the same or related disability and are unable to perform SGA, ` +
        `they may be eligible for Expedited Reinstatement (EXR) within 5 years of termination. ` +
        `Recommend contacting SSA or a certified CWIC immediately.`

    case 'EXR_ELIGIBLE':
      return `Client may be eligible for Expedited Reinstatement. Consult a CWIC.`
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function SSDITracker({ profile }: Props) {
  const status = evaluateSSDIStatus(profile, profile.currentMonthlyEarnings)
  const twpComplete = profile.twpMonthsUsed >= 9
  const summary = buildSummary(status, profile)

  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-tern-navy">SSDI Employment Tracker</h2>
        {status.benefitsPaidThisMonth ? (
          <span className="text-xs font-medium text-tern-teal bg-tern-teal/10 border border-tern-teal/30 px-2 py-0.5 rounded">
            Benefits paid this month
          </span>
        ) : (
          <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            Benefits suspended this month
          </span>
        )}
      </div>

      {/* Section 1: TWP */}
      <div className="px-4 py-3">
        <TWPProgress used={profile.twpMonthsUsed} />
      </div>

      {/* Section 2: SGA Risk */}
      <div className="px-4 py-3">
        <SGARisk profile={profile} status={status} />
      </div>

      {/* Section 3: EPE — only once TWP is exhausted */}
      {twpComplete && (
        <div className="px-4 py-3">
          <EPEStatus profile={profile} status={status} />
        </div>
      )}

      {/* Section 4: Plain-language summary */}
      <div className="px-4 py-3 bg-tern-ice">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</p>
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      </div>

      {/* Warning banner */}
      {status.warning && (
        <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200">
          <p className="text-xs text-amber-800">{status.warning}</p>
        </div>
      )}

    </div>
  )
}
