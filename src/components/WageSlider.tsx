import { useState, useEffect } from 'react'
import { fmt } from '../utils/format.ts'

interface Props {
  value: number
  onChange: (value: number) => void
}

const BREAK_EVEN = 2073  // (FBR * 2) + GIE + EIE = 994*2 + 20 + 65

function calcMonthly(hourly: number, hours: number): number {
  return Math.round((hourly * hours * 52) / 12)
}

export function WageSlider({ value, onChange }: Props) {
  const [hourly, setHourly] = useState('')
  const [hours, setHours] = useState('')

  // When both fields are filled, push the computed monthly value up
  useEffect(() => {
    const h = parseFloat(hourly)
    const w = parseFloat(hours)
    if (h > 0 && w > 0) {
      onChange(calcMonthly(h, w))
    }
  }, [hourly, hours]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearInputs() {
    setHourly('')
    setHours('')
  }

  const computedMonthly =
    parseFloat(hourly) > 0 && parseFloat(hours) > 0
      ? calcMonthly(parseFloat(hourly), parseFloat(hours))
      : null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">

      {/* Hours & Wage section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours &amp; Wage</p>
          {(hourly || hours) && (
            <button
              onClick={clearInputs}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hourly wage</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.25}
                value={hourly}
                onChange={e => setHourly(e.target.value)}
                placeholder="e.g. 8.50"
                className="w-full pl-6 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hours per week</label>
            <input
              type="number"
              min={0}
              max={40}
              step={0.5}
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. 20"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-tern-navy"
            />
          </div>
        </div>

        {computedMonthly !== null && (
          <p className="mt-2 text-xs text-tern-navy bg-tern-ice border border-tern-navy/20 rounded px-2.5 py-1.5">
            ${parseFloat(hourly).toFixed(2)}/hr × {parseFloat(hours)} hrs/wk
            {' '}= <strong>~{fmt(computedMonthly)}/month</strong> gross
          </p>
        )}
      </div>

      {/* Monthly total display + slider */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-4xl font-bold text-gray-900 tabular-nums">{fmt(value)}</span>
            <span className="text-base text-gray-400 ml-1">/mo gross wages</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={4000}
          step={25}
          value={value}
          onChange={e => {
            clearInputs()
            onChange(Number(e.target.value))
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#1B3A5C]"
          style={{
            background: `linear-gradient(to right, #1B3A5C ${(value / 4000) * 100}%, #e5e7eb ${(value / 4000) * 100}%)`
          }}
        />

        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$0</span>
          <span className="text-tern-teal font-medium">Break-even ~{fmt(BREAK_EVEN)}</span>
          <span>$4,000/mo</span>
        </div>
      </div>

      {/* Quick-set buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: '$0 (no work)', value: 0 },
          { label: '$500', value: 500 },
          { label: '$1,000', value: 1000 },
          { label: '$1,500', value: 1500 },
          { label: '$2,073 (break-even)', value: 2073 },
          { label: '$2,500', value: 2500 },
        ].map(btn => (
          <button
            key={btn.value}
            onClick={() => { clearInputs(); onChange(btn.value) }}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              value === btn.value && !hourly && !hours
                ? 'bg-tern-navy text-white border-tern-navy'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

    </div>
  )
}
