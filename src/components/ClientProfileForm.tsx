import type { ClientProfile, BenefitType, HouseholdType } from '../types/index.ts'
import { US_STATES } from '../data/states.ts'

// Keys in ClientProfile whose values are numbers — used to type the numInput helper
type NumericProfileKey = {
  [K in keyof ClientProfile]: ClientProfile[K] extends number ? K : never
}[keyof ClientProfile]

interface Props {
  profile: ClientProfile
  onChange: (profile: ClientProfile) => void
}

export function ClientProfileForm({ profile, onChange }: Props) {
  function set<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    onChange({ ...profile, [key]: value })
  }

  function numInput(key: NumericProfileKey, label: string, hint?: string) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
        {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
        <div className="relative">
          <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400 text-sm">$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={profile[key]}
            onChange={e => set(key, Number(e.target.value))}
            className="w-full pl-6 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">

      {/* Header */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-tern-navy">Client Profile</h2>
      </div>

      {/* Benefit Information */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Benefit Type</p>

        <div className="space-y-1">
          {(
            [
              ['SSI', 'SSI only'],
              ['SSDI', 'SSDI only'],
              ['CONCURRENT', 'Both (Concurrent)'],
            ] as [BenefitType, string][]
          ).map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="benefitType"
                value={val}
                checked={profile.benefitType === val}
                onChange={() => set('benefitType', val)}
                className="accent-[#1B3A5C]"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Household Type</p>
          <div className="space-y-1">
            {(
              [
                ['INDIVIDUAL', 'Individual'],
                ['ELIGIBLE_COUPLE', 'Eligible Couple'],
                ['MINOR_CHILD', 'Minor Child'],
              ] as [HouseholdType, string][]
            ).map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="householdType"
                  value={val}
                  checked={profile.householdType === val}
                  onChange={() => set('householdType', val)}
                  className="accent-[#1B3A5C]"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Income</p>
        {numInput('monthlyUnearnedIncome', 'Monthly Unearned Income', 'Pensions, interest, gifts — not SSI/SSDI')}
      </div>

      {/* Work Incentives */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Incentives</p>

        {/* SEIE */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.isStudent}
              onChange={e => set('isStudent', e.target.checked)}
              className="accent-[#1B3A5C]"
            />
            <span className="text-sm text-gray-700">Student under 22 (SEIE eligible)</span>
          </label>
          {profile.isStudent && (
            <div className="ml-5">
              {numInput('seieAnnualUsed', 'SEIE used this calendar year', `Cap: $9,730/yr — affects monthly exclusion`)}
            </div>
          )}
        </div>

        {/* Blindness */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.isBlind}
              onChange={e => set('isBlind', e.target.checked)}
              className="accent-[#1B3A5C]"
            />
            <span className="text-sm text-gray-700">Statutory blindness</span>
          </label>
        </div>

        {/* IRWE */}
        {numInput('monthlyIRWE', 'Monthly IRWE', 'Impairment Related Work Expenses — deducted before ÷2')}

        {/* BWE — blindness only */}
        {profile.isBlind && (
          numInput('monthlyBWE', 'Monthly BWE', 'Blind Work Expenses — deducted after ÷2')
        )}

        {/* PASS */}
        {numInput('monthlyPASS', 'Monthly PASS Deduction', 'Plan to Achieve Self-Support (SSA-approved)')}
      </div>

      {/* SSDI Details — only when SSDI or Concurrent */}
      {(profile.benefitType === 'SSDI' || profile.benefitType === 'CONCURRENT') && (
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SSDI Details</p>

          {numInput('monthlySSDIPayment', 'Monthly SSDI Payment')}
          {numInput('currentMonthlyEarnings', 'Current Monthly Gross Earnings', 'Used for TWP/SGA tracking')}

          {/* TWP months used */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">
              Trial Work Period months used
            </label>
            <p className="text-xs text-gray-400 mb-1">
              A TWP month is any month gross earnings exceed $1,210 (2026)
            </p>
            <input
              type="number"
              min={0}
              max={9}
              value={profile.twpMonthsUsed}
              onChange={e => set('twpMonthsUsed', Math.min(9, Math.max(0, Number(e.target.value))))}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
            />
          </div>

          {/* EPE toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.isInEPE}
                onChange={e => set('isInEPE', e.target.checked)}
                className="accent-[#1B3A5C]"
                disabled={profile.twpMonthsUsed < 9}
              />
              <span className={`text-sm ${profile.twpMonthsUsed < 9 ? 'text-gray-400' : 'text-gray-700'}`}>
                Client is currently in EPE
                {profile.twpMonthsUsed < 9 && ' (requires 9 TWP months)'}
              </span>
            </label>
            {profile.isInEPE && (
              <div className="ml-5">
                <label className="block text-xs font-medium text-gray-600 mb-0.5">
                  EPE start month
                </label>
                <input
                  type="month"
                  value={profile.epeStartMonth ?? ''}
                  onChange={e => set('epeStartMonth', e.target.value || null)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">State of Residence</label>
          <select
            value={profile.state}
            onChange={e => set('state', e.target.value)}
            className="w-full py-1.5 px-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
          >
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-0.5">Used for 1619(b) Medicaid threshold</p>
        </div>
      </div>

    </div>
  )
}
