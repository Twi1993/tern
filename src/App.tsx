import { useMemo, useState } from 'react'
import { ClientProfileForm } from './components/ClientProfileForm.tsx'
import { WageSlider } from './components/WageSlider.tsx'
import { BreakevenChart } from './components/BreakevenChart.tsx'
import { SSDITracker } from './components/SSDITracker.tsx'
import { SSICalculatorOutput } from './components/SSICalculatorOutput.tsx'
import { calculateSSI } from './engine/ssi-calculator.ts'
import { evaluate1619b } from './engine/medicaid-1619b.ts'
import { CURRENT_CONSTANTS } from './engine/benefit-constants.ts'
import type { ClientProfile } from './types/index.ts'

const DEFAULT_PROFILE: ClientProfile = {
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

export default function App() {
  const [profile, setProfile] = useState<ClientProfile>(DEFAULT_PROFILE)
  const [grossMonthlyWages, setGrossMonthlyWages] = useState(0)

  const baselineResult = useMemo(
    () => calculateSSI(profile, 0),
    [profile]
  )

  const result = useMemo(
    () => calculateSSI(profile, grossMonthlyWages),
    [profile, grossMonthlyWages]
  )

  const medicaid = useMemo(
    () => evaluate1619b(
      profile.state,
      grossMonthlyWages,
      profile.monthlyIRWE,
      profile.monthlyBWE,
      profile.monthlyPASS,
      result.adjustedSSIPayment,
    ),
    [profile.state, grossMonthlyWages, profile.monthlyIRWE, profile.monthlyBWE, profile.monthlyPASS, result.adjustedSSIPayment]
  )

  return (
    <div className="min-h-screen bg-tern-ice">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <img
            src="/tern-logo2.svg"
            alt="Tern"
            style={{ height: '32px', width: 'auto', display: 'block' }}
          />
          <span className="text-sm text-slate-400">Benefits Navigator</span>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid lg:grid-cols-[360px,1fr] gap-4 lg:gap-6 items-start">

          {/* Left panel — client profile */}
          <div className="lg:sticky lg:top-[57px]">
            <ClientProfileForm profile={profile} onChange={setProfile} />
          </div>

          {/* Right panel — wage slider + output */}
          <div className="space-y-3">
            <WageSlider value={grossMonthlyWages} onChange={setGrossMonthlyWages} />
            <BreakevenChart profile={profile} currentWage={grossMonthlyWages} />

            {/* SSDI tracker — shown for SSDI-only or Concurrent clients */}
            {(profile.benefitType === 'SSDI' || profile.benefitType === 'CONCURRENT') && (
              <SSDITracker profile={profile} />
            )}

            {/* SSI output — shown for SSI-only or Concurrent clients */}
            <SSICalculatorOutput
              result={result}
              baselineOutcome={baselineResult.totalFinancialOutcome}
              medicaid={medicaid}
              grossMonthlyWages={grossMonthlyWages}
              profile={profile}
            />
          </div>

        </div>
      </div>

    </div>
  )
}
